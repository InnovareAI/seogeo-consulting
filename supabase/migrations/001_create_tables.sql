-- Create table for SEO/GEO analysis results
CREATE TABLE IF NOT EXISTS seo_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  domain TEXT GENERATED ALWAYS AS (
    CASE
      WHEN url LIKE 'http://%' THEN split_part(split_part(url, 'http://', 2), '/', 1)
      WHEN url LIKE 'https://%' THEN split_part(split_part(url, 'https://', 2), '/', 1)
      ELSE NULL
    END
  ) STORED,
  seo_score INTEGER DEFAULT 0,
  geo_score INTEGER DEFAULT 0,
  analysis_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID
);

-- Indexes for seo_checks
CREATE INDEX IF NOT EXISTS idx_seo_checks_url ON seo_checks(url);
CREATE INDEX IF NOT EXISTS idx_seo_checks_domain ON seo_checks(domain);
CREATE INDEX IF NOT EXISTS idx_seo_checks_created_at ON seo_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_checks_scores ON seo_checks(seo_score, geo_score);

-- RLS for seo_checks
ALTER TABLE seo_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all SEO checks" ON seo_checks
  FOR SELECT USING (true);

CREATE POLICY "Users can create SEO checks" ON seo_checks
  FOR INSERT WITH CHECK (true);

-- Full history table with authority signals
CREATE TABLE IF NOT EXISTS seo_checker_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  brand TEXT,
  generic TEXT,
  seo_score NUMERIC,
  geo_score NUMERIC,
  seo_breakdown JSONB,
  geo_breakdown JSONB,
  recommendations JSONB,
  authority_signals JSONB,
  authority_status TEXT,
  multi_page_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_checker_report_history_domain_created
  ON seo_checker_report_history(domain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seo_checker_report_history_created
  ON seo_checker_report_history(created_at DESC);

ALTER TABLE seo_checker_report_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages seo checker history" ON seo_checker_report_history
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "authenticated users can read seo checker history" ON seo_checker_report_history
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "anon users can read seo checker history" ON seo_checker_report_history
  FOR SELECT
  USING (true);

-- Leads table for WordPress lead magnet
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company TEXT,
  website_analyzed TEXT,
  seo_score INTEGER,
  geo_score INTEGER,
  lead_source TEXT DEFAULT 'wordpress_seo_analyzer',
  website_source TEXT,
  analysis_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT now(),
  form_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_captured_at ON leads(captured_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');
