// Lord Tickets - Report Generation Edge Function
// Deploy: supabase functions deploy generate-report

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ReportRequest {
  type: "daily" | "weekly" | "monthly" | "flight" | "agent";
  startDate?: string;
  endDate?: string;
  flightId?: string;
  agentId?: string;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, startDate, endDate, flightId, agentId }: ReportRequest = await req.json();

    let reportData: any = {};
    let reportHtml = "";

    switch (type) {
      case "daily":
      case "weekly":
      case "monthly":
        reportData = await generatePeriodReport(supabase, type, startDate, endDate);
        reportHtml = generatePeriodReportHtml(reportData, type);
        break;

      case "flight":
        if (!flightId) throw new Error("flightId required for flight report");
        reportData = await generateFlightReport(supabase, flightId);
        reportHtml = generateFlightReportHtml(reportData);
        break;

      case "agent":
        if (!agentId) throw new Error("agentId required for agent report");
        reportData = await generateAgentReport(supabase, agentId, startDate, endDate);
        reportHtml = generateAgentReportHtml(reportData);
        break;

      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: reportData,
        html: reportHtml 
      }),
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

// Generate period report (daily/weekly/monthly)
async function generatePeriodReport(supabase: any, type: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date, end: Date;

  if (startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    end = now;
    switch (type) {
      case "daily":
        start = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "weekly":
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case "monthly":
        start = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        start = new Date(now.setDate(now.getDate() - 30));
    }
  }

  // Get flights in period
  const { data: flights } = await supabase
    .from("flights")
    .select("*")
    .gte("departure_date", start.toISOString().split("T")[0])
    .lte("departure_date", end.toISOString().split("T")[0]);

  // Get passengers in period
  const { data: passengers } = await supabase
    .from("passengers")
    .select("*, flights(destination)")
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString());

  // Calculate stats
  const totalRevenue = passengers?.reduce((sum: number, p: any) => sum + (p.selling_price || 0), 0) || 0;
  const totalCost = passengers?.reduce((sum: number, p: any) => sum + (p.cost_price || 0), 0) || 0;
  const totalProfit = totalRevenue - totalCost;
  const activePassengers = passengers?.filter((p: any) => p.status === "active").length || 0;
  const cancelledPassengers = passengers?.filter((p: any) => p.status === "cancelled").length || 0;

  // Group by destination
  const byDestination: Record<string, number> = {};
  passengers?.forEach((p: any) => {
    const dest = p.flights?.destination || "Unknown";
    byDestination[dest] = (byDestination[dest] || 0) + 1;
  });

  return {
    period: { type, start: start.toISOString(), end: end.toISOString() },
    summary: {
      totalFlights: flights?.length || 0,
      totalPassengers: passengers?.length || 0,
      activePassengers,
      cancelledPassengers,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0,
    },
    byDestination,
    flights: flights || [],
  };
}

// Generate flight report
async function generateFlightReport(supabase: any, flightId: string) {
  const { data: flight } = await supabase
    .from("flights")
    .select("*")
    .eq("id", flightId)
    .single();

  const { data: passengers } = await supabase
    .from("passengers")
    .select("*, users!passengers_agent_id_fkey(name)")
    .eq("flight_id", flightId);

  // Fetch deposit milestones
  const { data: depositMilestones } = await supabase
    .from("deposit_milestones")
    .select("*")
    .eq("flight_id", flightId)
    .order("sort_order", { ascending: true })
    .order("due_date", { ascending: true });

  const activePassengers = passengers?.filter((p: any) => p.status === "active") || [];
  const totalRevenue = activePassengers.reduce((sum: number, p: any) => sum + (p.selling_price || 0), 0);
  const totalCost = activePassengers.reduce((sum: number, p: any) => sum + (p.cost_price || 0), 0);

  // Calculate exposure data using price_paid for cash-in (actual money received)
  const cashIn = activePassengers.reduce((sum: number, p: any) => sum + (p.price_paid || 0), 0);
  const activeMilestones = (depositMilestones || []).filter((m: any) => m.status !== "cancelled");
  const totalSeats = flight?.total_seats || 0;
  
  const totalObligations = activeMilestones.reduce((sum: number, m: any) => {
    const amount = parseFloat(m.amount) || 0;
    return sum + (m.amount_type === "per_seat" ? amount * totalSeats : amount);
  }, 0);
  
  const depositsPaid = activeMilestones.reduce((sum: number, m: any) => sum + (parseFloat(m.paid_amount) || 0), 0);
  const depositsRemaining = totalObligations - depositsPaid;
  const exposure = depositsRemaining - cashIn;

  // Group by agent
  const byAgent: Record<string, any[]> = {};
  passengers?.forEach((p: any) => {
    const agentName = p.users?.name || "ללא סוכן";
    if (!byAgent[agentName]) byAgent[agentName] = [];
    byAgent[agentName].push(p);
  });

  return {
    flight,
    summary: {
      totalSeats,
      bookedSeats: activePassengers.length,
      availableSeats: totalSeats - activePassengers.length,
      occupancyRate: totalSeats ? ((activePassengers.length / totalSeats) * 100).toFixed(1) : 0,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
    },
    exposure: {
      hasMilestones: activeMilestones.length > 0,
      totalObligations,
      depositsPaid,
      depositsRemaining,
      cashIn,
      exposure,
      milestones: activeMilestones,
    },
    passengers: passengers || [],
    byAgent,
  };
}

// Generate agent report
async function generateAgentReport(supabase: any, agentId: string, startDate?: string, endDate?: string) {
  const { data: agent } = await supabase
    .from("users")
    .select("*")
    .eq("id", agentId)
    .single();

  let query = supabase
    .from("passengers")
    .select("*, flights(destination, departure_date)")
    .eq("agent_id", agentId);

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: passengers } = await query;

  const activePassengers = passengers?.filter((p: any) => p.status === "active") || [];
  const totalRevenue = activePassengers.reduce((sum: number, p: any) => sum + (p.selling_price || 0), 0);
  const totalCost = activePassengers.reduce((sum: number, p: any) => sum + (p.cost_price || 0), 0);
  const commission = totalRevenue * (agent?.commission_rate || 0);

  return {
    agent,
    period: { start: startDate, end: endDate },
    summary: {
      totalBookings: passengers?.length || 0,
      activeBookings: activePassengers.length,
      cancelledBookings: passengers?.filter((p: any) => p.status === "cancelled").length || 0,
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      commission,
    },
    passengers: passengers || [],
  };
}

// HTML Report Templates
function generatePeriodReportHtml(data: any, type: string) {
  const typeLabels: Record<string, string> = { daily: "יומי", weekly: "שבועי", monthly: "חודשי" };
  
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דו"ח ${typeLabels[type]} - Lord Tickets</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; direction: rtl; background: #f5f5f5; }
    .report { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; }
    .header h1 { margin: 0 0 10px 0; }
    .header p { margin: 0; opacity: 0.8; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 700; color: #1B365D; }
    .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
    .stat-card.profit .stat-value { color: #28A745; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    @media print { body { background: white; } .report { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>✈️ Lord Tickets - דו"ח ${typeLabels[type]}</h1>
      <p>תקופה: ${new Date(data.period.start).toLocaleDateString('he-IL')} - ${new Date(data.period.end).toLocaleDateString('he-IL')}</p>
    </div>
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.summary.totalFlights}</div>
          <div class="stat-label">טיסות</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.summary.activePassengers}</div>
          <div class="stat-label">נוסעים</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">₪${data.summary.totalRevenue.toLocaleString()}</div>
          <div class="stat-label">הכנסות</div>
        </div>
        <div class="stat-card profit">
          <div class="stat-value">₪${data.summary.totalProfit.toLocaleString()}</div>
          <div class="stat-label">רווח (${data.summary.profitMargin}%)</div>
        </div>
      </div>
      
      <h3>התפלגות לפי יעד</h3>
      <table>
        <thead>
          <tr><th>יעד</th><th>נוסעים</th></tr>
        </thead>
        <tbody>
          ${Object.entries(data.byDestination).map(([dest, count]) => `
            <tr><td>${dest}</td><td>${count}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="footer">
      הופק ב: ${new Date().toLocaleString('he-IL')} | Lord Tickets
    </div>
  </div>
</body>
</html>
  `;
}

function generateFlightReportHtml(data: any) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דו"ח טיסה - ${data.flight?.destination} - Lord Tickets</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; direction: rtl; background: #f5f5f5; }
    .report { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; }
    .header h1 { margin: 0 0 10px 0; }
    .content { padding: 30px; }
    .flight-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
    .info-card { background: #f8f9fa; padding: 15px; border-radius: 8px; }
    .info-label { color: #666; font-size: 12px; }
    .info-value { font-size: 18px; font-weight: 600; color: #1B365D; }
    .occupancy { text-align: center; padding: 20px; background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); border-radius: 8px; color: #0F1F3A; margin-bottom: 30px; }
    .occupancy-value { font-size: 48px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; }
    th { background: #f8f9fa; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>✈️ דו"ח טיסה - ${data.flight?.destination || 'N/A'}</h1>
      <p>${data.flight?.departure_date ? new Date(data.flight.departure_date).toLocaleDateString('he-IL') : ''}</p>
    </div>
    <div class="content">
      <div class="occupancy">
        <div class="occupancy-value">${data.summary.occupancyRate}%</div>
        <div>תפוסה (${data.summary.bookedSeats}/${data.summary.totalSeats} מקומות)</div>
      </div>
      
      <div class="flight-info">
        <div class="info-card">
          <div class="info-label">הכנסות</div>
          <div class="info-value">₪${data.summary.totalRevenue.toLocaleString()}</div>
        </div>
        <div class="info-card">
          <div class="info-label">עלויות</div>
          <div class="info-value">₪${data.summary.totalCost.toLocaleString()}</div>
        </div>
        <div class="info-card">
          <div class="info-label">רווח</div>
          <div class="info-value" style="color: #28A745;">₪${data.summary.totalProfit.toLocaleString()}</div>
        </div>
      </div>
      
      ${data.exposure?.hasMilestones ? `
      <h3 style="margin-top: 30px;">💰 לוח תשלומים לספק</h3>
      <div class="flight-info" style="margin-bottom: 20px;">
        <div class="info-card">
          <div class="info-label">סה"כ התחייבויות</div>
          <div class="info-value">$${data.exposure.totalObligations.toLocaleString()}</div>
        </div>
        <div class="info-card">
          <div class="info-label">שולם</div>
          <div class="info-value" style="color: #28A745;">$${data.exposure.depositsPaid.toLocaleString()}</div>
        </div>
        <div class="info-card">
          <div class="info-label">חשיפה</div>
          <div class="info-value" style="color: ${data.exposure.exposure > 0 ? '#DC3545' : '#28A745'};">
            ${data.exposure.exposure > 0 ? '-' : '+'}$${Math.abs(data.exposure.exposure).toLocaleString()}
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>תשלום</th><th>תאריך יעד</th><th>סכום</th><th>שולם</th><th>סטטוס</th></tr>
        </thead>
        <tbody>
          ${data.exposure.milestones.map((m: any) => {
            const statusMap: Record<string, string> = { paid: '✓ שולם', partial: '⟳ חלקי', pending: '⏳ ממתין', overdue: '⚠️ באיחור' };
            return `
            <tr>
              <td>${m.name}</td>
              <td>${m.due_date ? new Date(m.due_date).toLocaleDateString('he-IL') : '-'}</td>
              <td>$${(parseFloat(m.amount) || 0).toLocaleString()}</td>
              <td>$${(parseFloat(m.paid_amount) || 0).toLocaleString()}</td>
              <td>${statusMap[m.status] || m.status}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      ` : ''}
      
      <h3 style="margin-top: 30px;">רשימת נוסעים</h3>
      <table>
        <thead>
          <tr><th>#</th><th>שם</th><th>טלפון</th><th>סוכן</th><th>מחיר</th><th>סטטוס</th></tr>
        </thead>
        <tbody>
          ${data.passengers.map((p: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.first_name} ${p.last_name}</td>
              <td>${p.phone || '-'}</td>
              <td>${p.users?.name || '-'}</td>
              <td>₪${p.selling_price || 0}</td>
              <td>${p.status === 'active' ? '✓' : p.status === 'cancelled' ? '✗' : p.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="footer">
      הופק ב: ${new Date().toLocaleString('he-IL')} | Lord Tickets
    </div>
  </div>
</body>
</html>
  `;
}

function generateAgentReportHtml(data: any) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>דו"ח סוכן - ${data.agent?.name} - Lord Tickets</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; direction: rtl; background: #f5f5f5; }
    .report { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1B365D 0%, #0F1F3A 100%); color: white; padding: 30px; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: 700; color: #1B365D; }
    .stat-label { color: #666; font-size: 14px; }
    .commission { background: linear-gradient(135deg, #D4AF37 0%, #B8960C 100%); color: #0F1F3A; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px; }
    .commission-value { font-size: 36px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; }
    th { background: #f8f9fa; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>✈️ דו"ח סוכן - ${data.agent?.name || 'N/A'}</h1>
      <p>${data.period.start ? `${new Date(data.period.start).toLocaleDateString('he-IL')} - ${new Date(data.period.end).toLocaleDateString('he-IL')}` : 'כל הזמנים'}</p>
    </div>
    <div class="content">
      <div class="commission">
        <div class="commission-value">₪${data.summary.commission.toLocaleString()}</div>
        <div>עמלה (${((data.agent?.commission_rate || 0) * 100).toFixed(0)}%)</div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.summary.activeBookings}</div>
          <div class="stat-label">הזמנות פעילות</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">₪${data.summary.totalRevenue.toLocaleString()}</div>
          <div class="stat-label">סה"כ מכירות</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.summary.cancelledBookings}</div>
          <div class="stat-label">ביטולים</div>
        </div>
      </div>
      
      <h3>הזמנות</h3>
      <table>
        <thead>
          <tr><th>תאריך</th><th>נוסע</th><th>יעד</th><th>מחיר</th><th>סטטוס</th></tr>
        </thead>
        <tbody>
          ${data.passengers.map((p: any) => `
            <tr>
              <td>${new Date(p.created_at).toLocaleDateString('he-IL')}</td>
              <td>${p.first_name} ${p.last_name}</td>
              <td>${p.flights?.destination || '-'}</td>
              <td>₪${p.selling_price || 0}</td>
              <td>${p.status === 'active' ? '✓' : '✗'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="footer">
      הופק ב: ${new Date().toLocaleString('he-IL')} | Lord Tickets
    </div>
  </div>
</body>
</html>
  `;
}
