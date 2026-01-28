// Lord Tickets - Email Notification Edge Function
// Deploy: supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  to: string;
  subject: string;
  type: "booking_confirmation" | "cancellation" | "reminder" | "receipt";
  data: Record<string, any>;
}

// Email templates
const templates = {
  booking_confirmation: (data: Record<string, any>) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .logo { font-size: 40px; margin-bottom: 10px; }
    .content { padding: 30px; }
    .success-badge { background: #28A745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .details-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 600; color: #1B365D; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    .btn { display: inline-block; background: #D4AF37; color: #0F1F3A; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">✈️</div>
      <h1>Lord Tickets</h1>
    </div>
    <div class="content">
      <div class="success-badge">✓ ההזמנה אושרה</div>
      <h2>שלום ${data.passengerName},</h2>
      <p>ההזמנה שלך אושרה בהצלחה! להלן פרטי הטיסה:</p>
      
      <div class="details">
        <div class="details-row">
          <span class="label">מספר הזמנה:</span>
          <span class="value">${data.bookingNumber || 'N/A'}</span>
        </div>
        <div class="details-row">
          <span class="label">יעד:</span>
          <span class="value">${data.destination}</span>
        </div>
        <div class="details-row">
          <span class="label">תאריך יציאה:</span>
          <span class="value">${data.departureDate}</span>
        </div>
        <div class="details-row">
          <span class="label">תאריך חזרה:</span>
          <span class="value">${data.returnDate || 'טיסה בכיוון אחד'}</span>
        </div>
        <div class="details-row">
          <span class="label">מחיר:</span>
          <span class="value">₪${data.price}</span>
        </div>
      </div>
      
      <p>לשאלות נוספות ניתן לפנות לסוכן הנסיעות שלך.</p>
    </div>
    <div class="footer">
      <p>Lord Tickets - מערכת ניהול נוסעים</p>
      <p>מייל זה נשלח אוטומטית, אין להשיב אליו</p>
    </div>
  </div>
</body>
</html>
  `,

  cancellation: (data: Record<string, any>) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #DC3545 0%, #A71D2A 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .cancel-badge { background: #DC3545; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈️ Lord Tickets</h1>
    </div>
    <div class="content">
      <div class="cancel-badge">ביטול הזמנה</div>
      <h2>שלום ${data.passengerName},</h2>
      <p>ההזמנה שלך לטיסה ל${data.destination} בתאריך ${data.departureDate} בוטלה.</p>
      ${data.reason ? `<p><strong>סיבת הביטול:</strong> ${data.reason}</p>` : ''}
      <p>לשאלות נוספות ניתן לפנות לסוכן הנסיעות שלך.</p>
    </div>
    <div class="footer">
      <p>Lord Tickets - מערכת ניהול נוסעים</p>
    </div>
  </div>
</body>
</html>
  `,

  reminder: (data: Record<string, any>) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .reminder-badge { background: #FFC107; color: #000; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
    .countdown { font-size: 48px; color: #D4AF37; text-align: center; margin: 20px 0; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈️ Lord Tickets</h1>
    </div>
    <div class="content">
      <div class="reminder-badge">⏰ תזכורת טיסה</div>
      <h2>שלום ${data.passengerName},</h2>
      <div class="countdown">${data.daysUntil} ימים</div>
      <p style="text-align: center;">עד לטיסה שלך ל${data.destination}!</p>
      
      <div class="details">
        <p><strong>תאריך יציאה:</strong> ${data.departureDate}</p>
        <p><strong>יעד:</strong> ${data.destination}</p>
      </div>
      
      <p>אל תשכח/י:</p>
      <ul>
        <li>לארוז את המזוודות</li>
        <li>לבדוק תוקף דרכון</li>
        <li>להגיע לשדה התעופה 3 שעות לפני</li>
      </ul>
    </div>
    <div class="footer">
      <p>Lord Tickets - מערכת ניהול נוסעים</p>
    </div>
  </div>
</body>
</html>
  `,

  receipt: (data: Record<string, any>) => `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; direction: rtl; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .receipt-number { background: #D4AF37; color: #0F1F3A; padding: 10px 20px; border-radius: 20px; display: inline-block; margin-bottom: 20px; font-weight: 600; }
    .total { font-size: 32px; color: #28A745; text-align: center; margin: 20px 0; }
    .details { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈️ Lord Tickets</h1>
      <p>קבלה</p>
    </div>
    <div class="content">
      <div class="receipt-number">קבלה מס' ${data.receiptNumber}</div>
      
      <h2>שלום ${data.passengerName},</h2>
      <p>להלן פרטי התשלום שלך:</p>
      
      <div class="details">
        <p><strong>יעד:</strong> ${data.destination}</p>
        <p><strong>תאריך:</strong> ${data.departureDate}</p>
        <p><strong>סוג שירות:</strong> ${data.serviceType || 'טיסה'}</p>
      </div>
      
      <div class="total">₪${data.amount}</div>
      <p style="text-align: center; color: #28A745;">✓ שולם במלואו</p>
      
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
        תאריך הנפקה: ${data.issueDate || new Date().toLocaleDateString('he-IL')}
      </p>
    </div>
    <div class="footer">
      <p>Lord Tickets - מערכת ניהול נוסעים</p>
      <p>שמרו על קבלה זו לצרכי מס</p>
    </div>
  </div>
</body>
</html>
  `,
};

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    if (!to || !subject || !type || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, type, data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get template
    const template = templates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = template(data);

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set, logging email instead:");
      console.log({ to, subject, type });
      return new Response(
        JSON.stringify({ success: true, message: "Email logged (no API key)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Lord Tickets <noreply@lordtickets.com>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
