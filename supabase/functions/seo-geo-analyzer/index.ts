import { evaluateGeoSignals, orderBreakdown } from './geoScoring.ts';
import { evaluateSeoSignals, orderSeoBreakdown } from './seoScoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface SEOAnalysis {
  seoScore: number;
  geoScore: number;
  seoBreakdown?: SeoScoreBreakdown[];
  geoTags: string[];
  issues: string[];
  recommendations: Recommendation[];
  authoritySignals: AuthoritySignal[];
  authorityStatus: AuthorityStatus;
  geoBreakdown: GeoScoreBreakdown[];
  multiPageSummary?: MultiPageSummary;
}

type AuthorityStatus = 'ok' | 'missing_api_key' | 'error';

interface AuthoritySignal {
  source: string;
  summary: string;
  recommendedAction: string;
}

interface Recommendation {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

interface GeoScoreBreakdown {
  factor: string;
  points: number;
  detail: string;
}

interface SeoScoreBreakdown {
  factor: string;
  points: number;
  detail: string;
}

interface MultiPageSummary {
  aggregateGeoScore: number;
  pageCount: number;
  pages: MultiPageEntry[];
  factorAverages: GeoFactorAverage[];
}

interface MultiPageEntry {
  url: string;
  title?: string;
  geoScore: number;
  wordCount: number;
  issues: string[];
  geoBreakdown: GeoScoreBreakdown[];
  source: 'primary' | 'supplemental';
}

interface GeoFactorAverage {
  factor: string;
  averagePoints: number;
  detail: string;
}

interface SnapshotData {
  url: string;
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  langAttribute?: string;
  h1Tags: string[];
  h2Tags: string[];
  schemaMarkup: string[];
  loadTime: number;
  statusCode: number;
  pageSize: number;
  wordCount: number;
  analyzedAt: string;
}

const DEFAULT_USER_AGENT = 'SEO-Analyzer/1.0 (+https://seogeo-consulting.com)'

function sanitizeUrl(input: string): URL | null {
  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url
  } catch (_) {
    return null
  }
}

function extractTagContent(html: string, tag: string): string | undefined {
  const patterns = [
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) {
      return match[1].trim()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');
    }
  }
  return undefined;
}

function extractMetaContent(html: string, name: string): string | undefined {
  let regex = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i')
  let match = html.match(regex)
  if (match) return match[1].trim()
  regex = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["'][^>]*>`, 'i')
  match = html.match(regex)
  return match ? match[1].trim() : undefined
}

function extractAllTags(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const matches: string[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    let text = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
    if (text) matches.push(text);
  }
  return matches
}

function extractScriptLdJson(html: string): string[] {
  const scripts: string[] = []
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1].trim()
    if (content) scripts.push(content)
  }
  return scripts
}

function extractCanonicalUrl(html: string): string | undefined {
  const regex = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i
  const match = html.match(regex)
  return match ? match[1].trim() : undefined
}

function buildSnapshot(targetUrl: URL, body: string, loadTime: number, statusCode: number, sizeBytes: number): SnapshotData {
  let title = extractTagContent(body, 'title');
  if (!title) {
    title = extractMetaContent(body, 'og:title');
  }
  const metaDescription = extractMetaContent(body, 'description')
  const canonicalUrl = extractCanonicalUrl(body)
  const langAttributeMatch = body.match(/<html[^>]*lang=["']([^"']*)["'][^>]*>/i)
  const h1Tags = extractAllTags(body, 'h1')
  const h2Tags = extractAllTags(body, 'h2')
  const schemaMarkupRaw = extractScriptLdJson(body)
  const wordCount = body.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
  return {
    url: targetUrl.toString(),
    title,
    metaDescription,
    canonicalUrl,
    langAttribute: langAttributeMatch ? langAttributeMatch[1] : undefined,
    h1Tags,
    h2Tags,
    schemaMarkup: schemaMarkupRaw,
    loadTime,
    statusCode,
    pageSize: Math.round(sizeBytes / 1024),
    wordCount,
    analyzedAt: new Date().toISOString()
  }
}

function inferGeoTags(text: string): string[] {
  const tags = new Set<string>()
  const lower = text.toLowerCase()
  if (lower.includes('united states') || lower.includes('usa')) tags.add('United States')
  if (lower.includes('united kingdom') || lower.includes('uk')) tags.add('United Kingdom')
  if (lower.includes('european union') || lower.includes('eu')) tags.add('European Union')
  return Array.from(tags)
}

async function generateAiRecommendations(params: {
  apiKey: string;
  model: string;
  seoScore: number;
  geoScore: number;
  issues: string[];
}): Promise<Recommendation[] | null> {
  const { apiKey, model, seoScore, geoScore, issues } = params
  const prompt = `You are an SEO strategist. Based on these scores and issues, return a JSON array with 3-5 recommendations.
Each item must have: title (string), detail (string), priority ("high" | "medium" | "low").
SEO Score: ${seoScore}/100
GEO Score: ${geoScore}/100
Issues: ${issues.join('; ') || 'None detected'}
Return JSON array only, no extra text.`
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://seogeo-consulting.com',
        'X-Title': 'SEO Analyzer'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Respond with a JSON array only.' },
          { role: 'user', content: prompt }
        ]
      })
    })
    if (!response.ok) return null
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content?.trim()
    if (!content) return null
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return null
    return parsed.slice(0, 5).map((item: Record<string, unknown>) => ({
      title: String(item.title ?? 'Recommendation'),
      detail: String(item.detail ?? ''),
      priority: ['high', 'medium', 'low'].includes(item.priority as string) ? item.priority as 'high' | 'medium' | 'low' : 'medium'
    }))
  } catch (error) {
    console.error('AI recommendation error:', error)
    return null
  }
}

async function persistToHistory(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return
  try {
    await fetch(`${supabaseUrl}/rest/v1/seo_checker_report_history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      body: JSON.stringify([payload])
    })
  } catch (error) {
    console.error('Persist error:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { url } = await req.json()
    const validatedUrl = sanitizeUrl(url)
    if (!validatedUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    const start = performance.now()
    const response = await fetch(validatedUrl.toString(), {
      redirect: 'follow',
      headers: { 'User-Agent': DEFAULT_USER_AGENT }
    })
    const loadTime = Math.round(performance.now() - start)
    const statusCode = response.status
    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `HTTP ${statusCode}`, statusCode }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    const body = await response.text()
    const encoder = new TextEncoder()
    const sizeBytes = encoder.encode(body).length
    const snapshot = buildSnapshot(validatedUrl, body, loadTime, statusCode, sizeBytes)
    const geoEvaluation = evaluateGeoSignals(body, snapshot)
    const seoEvaluation = evaluateSeoSignals(body, snapshot, validatedUrl.toString())
    const geoTags = inferGeoTags(body)
    // Derive issues
    const issues: string[] = []
    if (!snapshot.title) issues.push('Missing <title> tag')
    if (!snapshot.metaDescription) issues.push('Missing meta description')
    if (snapshot.h1Tags.length === 0) issues.push('Missing H1 heading')
    if (snapshot.h2Tags.length < 3) issues.push('Add more H2 subheadings')
    if (!snapshot.schemaMarkup.length) issues.push('No schema.org structured data')
    if (snapshot.wordCount < 500) issues.push('Content is thin (<500 words)')
    // Generate AI recommendations
    let recommendations: Recommendation[] = []
    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    if (openAiKey) {
      const aiRecs = await generateAiRecommendations({
        apiKey: openAiKey,
        model: 'openai/gpt-4o-mini',
        seoScore: seoEvaluation.score,
        geoScore: geoEvaluation.score,
        issues
      })
      if (aiRecs) recommendations = aiRecs
    }
    const analysis: SEOAnalysis = {
      seoScore: seoEvaluation.score,
      geoScore: geoEvaluation.score,
      seoBreakdown: orderSeoBreakdown(seoEvaluation.breakdown),
      geoTags,
      issues,
      recommendations,
      authoritySignals: [],
      authorityStatus: 'ok',
      geoBreakdown: orderBreakdown(geoEvaluation.breakdown),
    }
    // Persist to history
    persistToHistory({
      url: snapshot.url,
      domain: validatedUrl.hostname,
      seo_score: analysis.seoScore,
      geo_score: analysis.geoScore,
      seo_breakdown: analysis.seoBreakdown,
      geo_breakdown: analysis.geoBreakdown,
      recommendations
    })
    return new Response(
      JSON.stringify({ success: true, snapshot, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Analyzer error:', error)
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
