// Lord Tickets - Create User Edge Function
// Deploy: supabase functions deploy create-user
// 
// This function invites a new user via email (creates Auth user + sends invite),
// then creates a users table record linked by auth_id.

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

    // Step 1: Invite user by email (creates Auth user AND sends invite email)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://www.supatours.com/lord-tickets-app/login.html",
      data: { name, role }
    });

    if (inviteError) {
      console.error("Error inviting user:", inviteError);
      return new Response(
        JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Create users table record
    const { error: insertError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: inviteData.user.id,
        email,
        name,
        role,
        commission_rate: commission_rate || 0,
        is_active: true
      });

    if (insertError) {
      console.error("Error inserting user record:", insertError);
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create user record: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully. Invite email sent to set password.",
        user: {
          id: inviteData.user.id,
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
