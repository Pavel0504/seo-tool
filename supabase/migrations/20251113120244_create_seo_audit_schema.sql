/*
  # SEO Audit Tool Database Schema

  Creates tables for storing SEO audit data:
  - audits: audit sessions
  - url_checks: individual URL analysis results
  - seo_issues: identified issues
  - robots_txt_analysis: robots.txt analysis
  - sitemap_analysis: sitemap analysis
  - exclusion_rules: URL exclusion rules
*/

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_urls integer DEFAULT 0,
  urls_checked integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS url_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES audits(id) ON DELETE CASCADE,
  url text NOT NULL,
  url_type text,
  http_status integer,
  redirect_chain jsonb,
  response_time integer,
  title text,
  title_length integer,
  meta_description text,
  meta_description_length integer,
  h1_tags jsonb,
  h1_count integer DEFAULT 0,
  canonical_url text,
  robots_meta text,
  has_noindex boolean DEFAULT false,
  has_nofollow boolean DEFAULT false,
  images_without_alt integer DEFAULT 0,
  broken_images integer DEFAULT 0,
  content_length integer DEFAULT 0,
  internal_links integer DEFAULT 0,
  external_links integer DEFAULT 0,
  broken_links integer DEFAULT 0,
  has_https boolean DEFAULT true,
  mixed_content boolean DEFAULT false,
  checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seo_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES audits(id) ON DELETE CASCADE,
  url_check_id uuid REFERENCES url_checks(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  severity text NOT NULL,
  issue_code text NOT NULL,
  description text NOT NULL,
  recommendation text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS robots_txt_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES audits(id) ON DELETE CASCADE,
  content text,
  has_errors boolean DEFAULT false,
  errors jsonb,
  blocked_important_paths jsonb,
  recommendations jsonb,
  corrected_content text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sitemap_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES audits(id) ON DELETE CASCADE,
  sitemap_url text NOT NULL,
  total_urls integer DEFAULT 0,
  urls_with_errors integer DEFAULT 0,
  urls_with_noindex integer DEFAULT 0,
  missing_important_urls jsonb,
  issues jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exclusion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL,
  url_pattern text NOT NULL,
  reason text,
  exclude_from_sitemap boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE robots_txt_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitemap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusion_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to audits"
  ON audits FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to url_checks"
  ON url_checks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to seo_issues"
  ON seo_issues FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to robots_txt_analysis"
  ON robots_txt_analysis FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to sitemap_analysis"
  ON sitemap_analysis FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to exclusion_rules"
  ON exclusion_rules FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_url_checks_audit_id ON url_checks(audit_id);
CREATE INDEX IF NOT EXISTS idx_url_checks_http_status ON url_checks(http_status);
CREATE INDEX IF NOT EXISTS idx_seo_issues_audit_id ON seo_issues(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_issues_severity ON seo_issues(severity);
CREATE INDEX IF NOT EXISTS idx_seo_issues_issue_type ON seo_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_site_url ON exclusion_rules(site_url);
