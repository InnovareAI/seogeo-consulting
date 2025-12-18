# SEO/GEO Analyzer - Project Handover Document

**Project:** Business SEO/GEO Analyzer
**Date:** December 18, 2024
**Live URL:** https://seogeo-consulting.netlify.app
**GitHub:** https://github.com/InnovareAI/seogeo-consulting

---

## Overview

A web application that analyzes websites for both traditional SEO (Search Engine Optimization) and GEO (Generative Engine Optimization - AI readiness). Users enter a URL, receive detailed scores and recommendations, and can have the full report emailed to them.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Netlify)                      │
│              React + Vite + TypeScript + TailwindCSS         │
│                seogeo-consulting.netlify.app                 │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Edge Functions (Deno)                   │    │
│  │                                                      │    │
│  │  • seo-geo-analyzer    - Main analysis function      │    │
│  │  • send-report-email   - Email reports via Postmark  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PostgreSQL Database                     │    │
│  │                                                      │    │
│  │  • seo_checker_report_history - Analysis history     │    │
│  │  • email_captures             - Lead tracking        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│                                                              │
│  • OpenRouter API (GPT-4o-mini) - AI recommendations        │
│  • Postmark - Transactional emails                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 7, TypeScript |
| Styling | TailwindCSS v4 |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| Email | Postmark |
| AI | OpenRouter (GPT-4o-mini) |
| Hosting | Netlify |
| Version Control | GitHub |

---

## Project Structure

```
SEOGEO_Consulting/
├── src/
│   ├── components/
│   │   └── SEOChecker.tsx      # Main UI component
│   ├── lib/
│   │   └── supabase.ts         # Supabase client config
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # TailwindCSS imports
├── supabase/
│   ├── functions/
│   │   ├── seo-geo-analyzer/
│   │   │   ├── index.ts        # Main analysis function
│   │   │   ├── seoScoring.ts   # SEO scoring logic
│   │   │   └── geoScoring.ts   # GEO scoring logic
│   │   └── send-report-email/
│   │       └── index.ts        # Email sending function
│   └── migrations/
│       └── *.sql               # Database migrations
├── .env                        # Environment variables
├── netlify.toml                # Netlify config
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://vgfaqwlzaiuwuwqsghns.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Secrets
```bash
# View current secrets
supabase secrets list

# Required secrets:
OPENAI_API_KEY=sk-or-v1-...        # OpenRouter API key
POSTMARK_SERVER_TOKEN=77cdd228-... # Postmark server token
```

---

## Database Tables

### seo_checker_report_history
Stores all analysis results for historical tracking.

```sql
CREATE TABLE seo_checker_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  domain TEXT,
  seo_score INTEGER,
  geo_score INTEGER,
  seo_breakdown JSONB,
  geo_breakdown JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### email_captures
Tracks leads who requested email reports.

```sql
CREATE TABLE email_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  url_analyzed TEXT NOT NULL,
  seo_score INTEGER,
  geo_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Scoring System

### SEO Score (0-100)
Evaluates traditional search engine optimization factors:
- Title tag (0-10 pts)
- Meta description (0-10 pts)
- H1 tags (0-10 pts)
- H2 structure (0-10 pts)
- Content depth/word count (0-10 pts)
- Schema markup (0-10 pts)
- Canonical URL (0-10 pts)
- Internal links (0-10 pts)
- Page speed (0-10 pts)
- Mobile optimization (0-10 pts)

### GEO Score (0-100)
Evaluates AI-readiness for ChatGPT, Perplexity, Claude:
- Conversational headings (0-10 pts)
- FAQ schema (0-10 pts)
- Authority signals/E-E-A-T (0-10 pts)
- Structured data (0-10 pts)
- Clear definitions (0-10 pts)
- Cite-able statistics (0-10 pts)
- Expert credentials (0-10 pts)
- Source attribution (0-10 pts)
- Content freshness (0-10 pts)
- Topical depth (0-10 pts)

---

## Deployment

### Frontend (Netlify)
```bash
# Build and deploy
npm run build
netlify deploy --prod --dir=dist

# Or push to GitHub (auto-deploys if configured)
git push origin main
```

### Edge Functions (Supabase)
```bash
# Deploy single function
supabase functions deploy seo-geo-analyzer --no-verify-jwt
supabase functions deploy send-report-email --no-verify-jwt

# Deploy all functions
supabase functions deploy --no-verify-jwt
```

### Database Migrations
```bash
# Push migrations to Supabase
supabase db push

# Or run SQL directly in Supabase Dashboard > SQL Editor
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/components/SEOChecker.tsx` | Main UI - form, results display, email capture |
| `supabase/functions/seo-geo-analyzer/index.ts` | URL fetching, analysis orchestration |
| `supabase/functions/seo-geo-analyzer/seoScoring.ts` | SEO scoring algorithms |
| `supabase/functions/seo-geo-analyzer/geoScoring.ts` | GEO scoring algorithms |
| `supabase/functions/send-report-email/index.ts` | Email template and Postmark integration |

---

## Email Configuration

**Service:** Postmark
**Sender:** 3cubed AI Team <info@3cubed.ai>
**Template:** HTML email with dark theme matching the app

To change sender email, edit `supabase/functions/send-report-email/index.ts`:
```typescript
From: '3cubed AI Team <info@3cubed.ai>',
```

---

## Common Tasks

### Add a new SEO factor
1. Edit `supabase/functions/seo-geo-analyzer/seoScoring.ts`
2. Add scoring logic in `evaluateSeoSignals()`
3. Update `orderSeoBreakdown()` for display order
4. Redeploy: `supabase functions deploy seo-geo-analyzer --no-verify-jwt`

### Add a new GEO factor
1. Edit `supabase/functions/seo-geo-analyzer/geoScoring.ts`
2. Add scoring logic in `evaluateGeoSignals()`
3. Update `orderBreakdown()` for display order
4. Redeploy: `supabase functions deploy seo-geo-analyzer --no-verify-jwt`

### Modify email template
1. Edit `supabase/functions/send-report-email/index.ts`
2. Update `generateEmailHtml()` function
3. Redeploy: `supabase functions deploy send-report-email --no-verify-jwt`

### Update AI recommendation prompt
1. Edit `supabase/functions/seo-geo-analyzer/index.ts`
2. Modify `generateAiRecommendations()` prompt
3. Redeploy: `supabase functions deploy seo-geo-analyzer --no-verify-jwt`

---

## Credentials & Access

| Service | Dashboard URL |
|---------|---------------|
| Supabase | https://supabase.com/dashboard/project/vgfaqwlzaiuwuwqsghns |
| Netlify | https://app.netlify.com/projects/seogeo-consulting |
| GitHub | https://github.com/InnovareAI/seogeo-consulting |
| Postmark | https://account.postmarkapp.com |
| OpenRouter | https://openrouter.ai |

---

## Troubleshooting

### "Analysis service unavailable"
- Check Supabase Edge Function logs
- Verify `OPENAI_API_KEY` is set in Supabase secrets
- Redeploy function: `supabase functions deploy seo-geo-analyzer --no-verify-jwt`

### Emails not sending
- Check Postmark activity log
- Verify `POSTMARK_SERVER_TOKEN` in Supabase secrets
- Ensure sender email is verified in Postmark

### Scores seem off
- Check browser console for API response
- Review scoring logic in `seoScoring.ts` / `geoScoring.ts`
- Test with known good/bad URLs

---

## Branding

- **Colors:** Black background (#000), Cyan headings (#22d3ee), Orange buttons (#f97316)
- **Footer:** "Powered by 3Cubed.ai"
- **Fonts:** System fonts (Apple system, Segoe UI, etc.)

---

## Future Enhancements (Suggested)

1. **Multi-page analysis** - Crawl and analyze multiple pages
2. **Competitor comparison** - Compare against competitor URLs
3. **Historical tracking** - Show score changes over time
4. **PDF export** - Generate downloadable PDF reports
5. **Scheduled monitoring** - Weekly/monthly automated checks
6. **White-label option** - Custom branding for clients

---

*Document generated: December 18, 2024*
