/*
  # Add URL Tracking and Sitemap Storage

  1. New Tables
    - `found_urls` - tracks all URLs discovered in audit
      - `id` (uuid, primary key)
      - `audit_id` (uuid, foreign key to audits)
      - `url` (text)
      - `source` (text - 'json_list' or 'sitemap')
      - `url_type` (text)
      - `is_new` (boolean - true if URL wasn't in previous audit)
      - `is_deleted` (boolean - true if URL was removed from site)
      - `discovered_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sitemap_urls` - stores all URLs from sitemaps
      - `id` (uuid, primary key)
      - `audit_id` (uuid, foreign key to audits)
      - `sitemap_url` (text - URL of sitemap file)
      - `url` (text - individual URL from sitemap)
      - `lastmod` (text - lastmod from sitemap)
      - `priority` (text - priority from sitemap)
      - `changefreq` (text - changefreq from sitemap)
      - `discovered_at` (timestamptz)

  2. Modified Tables
    - `audits` - add fields for batch processing
      - `last_url_check_offset` (integer - offset for next batch)
      - `total_found_urls` (integer - total count before sampling)
      - `new_urls_count` (integer)
      - `deleted_urls_count` (integer)

  3. Security
    - Enable RLS on new tables with allow all policies (internal tool)
    - Create indexes for efficient queries
*/

ALTER TABLE audits ADD COLUMN IF NOT EXISTS last_url_check_offset integer DEFAULT 0;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS total_found_urls integer DEFAULT 0;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS new_urls_count integer DEFAULT 0;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS deleted_urls_count integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS found_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  url text NOT NULL,
  source text NOT NULL CHECK (source IN ('json_list', 'sitemap')),
  url_type text,
  is_new boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  discovered_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(audit_id, url)
);

CREATE TABLE IF NOT EXISTS sitemap_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  sitemap_url text NOT NULL,
  url text NOT NULL,
  lastmod text,
  priority text,
  changefreq text,
  discovered_at timestamptz DEFAULT now()
);

ALTER TABLE found_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitemap_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to found_urls"
  ON found_urls FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to sitemap_urls"
  ON sitemap_urls FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_found_urls_audit_id ON found_urls(audit_id);
CREATE INDEX IF NOT EXISTS idx_found_urls_url ON found_urls(url);
CREATE INDEX IF NOT EXISTS idx_found_urls_is_new ON found_urls(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_found_urls_is_deleted ON found_urls(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_sitemap_urls_audit_id ON sitemap_urls(audit_id);
CREATE INDEX IF NOT EXISTS idx_sitemap_urls_sitemap_url ON sitemap_urls(sitemap_url);
