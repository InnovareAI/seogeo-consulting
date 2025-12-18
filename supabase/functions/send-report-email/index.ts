const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface EmailRequest {
  email: string;
  url: string;
  seoScore: number;
  geoScore: number;
  seoBreakdown: Array<{ factor: string; points: number; detail: string }>;
  geoBreakdown: Array<{ factor: string; points: number; detail: string }>;
  issues: string[];
  recommendations: Array<{
    title: string;
    detail: string;
    priority: string;
    category: string;
    impact: string;
    steps: string[];
  }>;
  snapshot: {
    title?: string;
    metaDescription?: string;
    loadTime: number;
    wordCount: number;
  };
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#4ade80'; // green
  if (score >= 60) return '#22d3ee'; // cyan
  if (score >= 40) return '#fb923c'; // orange
  return '#f87171'; // red
}

function generateEmailHtml(data: EmailRequest): string {
  const seoColor = getScoreColor(data.seoScore);
  const geoColor = getScoreColor(data.geoScore);

  const issuesHtml = data.issues.length > 0
    ? data.issues.map(issue => `<li style="color: #fb923c; margin-bottom: 8px;">${issue}</li>`).join('')
    : '<li style="color: #4ade80;">No critical issues found</li>';

  const recommendationsHtml = data.recommendations.map((rec, i) => `
    <div style="background: #27272a; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${
      rec.category === 'seo' ? '#22d3ee' :
      rec.category === 'geo' ? '#fb923c' :
      rec.category === 'technical' ? '#a855f7' : '#4ade80'
    };">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 24px; font-weight: bold; color: #52525b;">${i + 1}</span>
        <span style="font-size: 18px; font-weight: 600; color: white;">${rec.title}</span>
        <span style="background: ${
          rec.priority === 'high' ? '#7f1d1d' :
          rec.priority === 'medium' ? '#7c2d12' : '#164e63'
        }; color: ${
          rec.priority === 'high' ? '#fca5a5' :
          rec.priority === 'medium' ? '#fdba74' : '#67e8f9'
        }; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase;">${rec.priority}</span>
      </div>
      <p style="color: #d4d4d8; margin-bottom: 12px;">${rec.detail}</p>
      ${rec.impact ? `
        <div style="background: #18181b; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span style="color: #71717a; font-size: 12px; text-transform: uppercase;">Expected Impact</span>
          <p style="color: #4ade80; font-weight: 500; margin-top: 4px;">${rec.impact}</p>
        </div>
      ` : ''}
      ${rec.steps && rec.steps.length > 0 ? `
        <div>
          <span style="color: #71717a; font-size: 12px; text-transform: uppercase;">Implementation Steps</span>
          <ol style="margin-top: 8px; padding-left: 0; list-style: none;">
            ${rec.steps.map((step, j) => `
              <li style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
                <span style="flex-shrink: 0; width: 24px; height: 24px; background: #3f3f46; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #a1a1aa;">${j + 1}</span>
                <span style="color: #a1a1aa; font-size: 14px;">${step}</span>
              </li>
            `).join('')}
          </ol>
        </div>
      ` : ''}
    </div>
  `).join('');

  const seoBreakdownHtml = data.seoBreakdown.map(factor => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; color: white;">${factor.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">${factor.detail}</td>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; text-align: right; font-weight: bold; color: ${factor.points >= 8 ? '#4ade80' : factor.points >= 4 ? '#fb923c' : '#f87171'};">${factor.points} pts</td>
    </tr>
  `).join('');

  const geoBreakdownHtml = data.geoBreakdown.map(factor => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; color: #67e8f9;">${factor.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">${factor.detail}</td>
      <td style="padding: 12px; border-bottom: 1px solid #3f3f46; text-align: right; font-weight: bold; color: ${factor.points >= 8 ? '#4ade80' : factor.points >= 4 ? '#fb923c' : '#f87171'};">${factor.points} pts</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SEO/GEO Analysis Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
  <div style="max-width: 700px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #22d3ee; font-size: 32px; margin-bottom: 8px;">SEO/GEO Analysis Report</h1>
      <p style="color: #71717a; font-size: 16px;">Analysis for: <span style="color: #22d3ee;">${data.url}</span></p>
    </div>

    <!-- Score Cards -->
    <div style="display: flex; gap: 20px; margin-bottom: 40px;">
      <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; text-align: center;">
        <div style="font-size: 56px; font-weight: bold; color: ${seoColor};">${data.seoScore}</div>
        <div style="font-size: 18px; color: #71717a;">/ 100</div>
        <div style="font-size: 18px; font-weight: 600; color: #22d3ee; margin-top: 12px;">SEO Score</div>
        <p style="color: #71717a; font-size: 14px; margin-top: 4px;">Google & traditional search</p>
      </div>
      <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; text-align: center;">
        <div style="font-size: 56px; font-weight: bold; color: ${geoColor};">${data.geoScore}</div>
        <div style="font-size: 18px; color: #71717a;">/ 100</div>
        <div style="font-size: 18px; font-weight: 600; color: #22d3ee; margin-top: 12px;">GEO Score</div>
        <p style="color: #71717a; font-size: 14px; margin-top: 4px;">ChatGPT, Perplexity & AI</p>
      </div>
    </div>

    <!-- Page Snapshot -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 40px;">
      <h2 style="color: #22d3ee; font-size: 20px; margin-bottom: 16px;">Page Snapshot</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Title</td>
          <td style="padding: 8px 0; color: white; text-align: right;">${data.snapshot.title || 'Not found'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Load Time</td>
          <td style="padding: 8px 0; color: white; text-align: right;">${data.snapshot.loadTime}ms</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #71717a;">Word Count</td>
          <td style="padding: 8px 0; color: white; text-align: right;">${data.snapshot.wordCount?.toLocaleString() || 0}</td>
        </tr>
      </table>
    </div>

    <!-- Issues -->
    <div style="background: #18181b; border: 1px solid #7c2d12; border-radius: 16px; padding: 24px; margin-bottom: 40px;">
      <h2 style="color: #fb923c; font-size: 20px; margin-bottom: 16px;">Issues Found</h2>
      <ul style="margin: 0; padding-left: 20px;">
        ${issuesHtml}
      </ul>
    </div>

    <!-- Recommendations -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 40px;">
      <h2 style="color: #22d3ee; font-size: 20px; margin-bottom: 8px;">Detailed Recommendations</h2>
      <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">AI-generated action plan based on your analysis results</p>
      ${recommendationsHtml}
    </div>

    <!-- SEO Breakdown -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; margin-bottom: 40px;">
      <h2 style="color: #22d3ee; font-size: 20px; margin-bottom: 16px;">SEO Factor Breakdown</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${seoBreakdownHtml}
      </table>
    </div>

    <!-- GEO Breakdown -->
    <div style="background: #18181b; border: 1px solid #164e63; border-radius: 16px; padding: 24px; margin-bottom: 40px;">
      <h2 style="color: #22d3ee; font-size: 20px; margin-bottom: 16px;">GEO (AI) Factor Breakdown</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${geoBreakdownHtml}
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #27272a;">
      <p style="color: #71717a; font-size: 14px;">
        Powered by <span style="color: #22d3ee;">3Cubed.ai</span>
      </p>
      <p style="color: #52525b; font-size: 12px; margin-top: 8px;">
        Need help improving your scores? <a href="https://3cubed.ai/contact" style="color: #fb923c;">Contact our team</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const data: EmailRequest = await req.json();

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const htmlContent = generateEmailHtml(data);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: '3Cubed.ai <reports@3cubed.ai>',
        to: [data.email],
        subject: `Your SEO/GEO Analysis Report - ${data.url}`,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = await response.json();

    // Also save to database for lead tracking
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/email_captures`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
          },
          body: JSON.stringify([{
            email: data.email,
            url_analyzed: data.url,
            seo_score: data.seoScore,
            geo_score: data.geoScore
          }])
        });
      } catch (e) {
        console.error('Failed to save email capture:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
