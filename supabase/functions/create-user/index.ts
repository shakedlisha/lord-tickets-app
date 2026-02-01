// Lord Tickets - Create User Edge Function
// Deploy: supabase functions deploy create-user
// 
// This function creates both a Supabase Auth user and a users table record,
// then sends a password reset email so the user can set their own password.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CreateUserRequest {
  name: string;
  email: string;
  role: "admin" | "manager" | "agent";
  commission_rate?: number;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's JWT to verify caller
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Admin client with service role key for creating users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is authenticated
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller has admin or manager role
    const { data: callerData, error: callerError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_id", caller.id)
      .single();

    if (callerError || !callerData) {
      return new Response(
        JSON.stringify({ error: "Caller not found in users table" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "manager"].includes(callerData.role)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin or manager role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { name, email, role, commission_rate }: CreateUserRequest = await req.json();

    // Validate required fields
    if (!name || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!["admin", "manager", "agent"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be: admin, manager, or agent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create Auth user
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Mark email as confirmed
      user_metadata: { name, role }
    });

    if (createAuthError) {
      console.error("Error creating auth user:", createAuthError);
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${createAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create users table record
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email,
        name,
        role,
        commission_rate: commission_rate || 0,
        is_active: true
      });

    if (insertError) {
      console.error("Error inserting user record:", insertError);
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create user record: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Generate password recovery link (sends email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://www.supatours.com/lord-tickets-app/login.html"
      }
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      // User is created but email failed - log warning but don't fail
      console.warn("User created but password reset email failed. Admin may need to resend.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully. Password reset email sent.",
        user: {
          id: authData.user.id,
          email,
          name,
          role
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
