import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Audit = {
  id: string;
  site_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  total_urls: number;
  urls_checked: number;
  created_at: string;
};

export type UrlCheck = {
  id: string;
  audit_id: string;
  url: string;
  url_type: string;
  http_status: number;
  redirect_chain?: any[];
  response_time: number;
  title?: string;
  title_length?: number;
  meta_description?: string;
  meta_description_length?: number;
  h1_tags?: string[];
  h1_count: number;
  canonical_url?: string;
  robots_meta?: string;
  has_noindex: boolean;
  has_nofollow: boolean;
  images_without_alt: number;
  broken_images: number;
  content_length: number;
  internal_links: number;
  external_links: number;
  broken_links: number;
  has_https: boolean;
  mixed_content: boolean;
  checked_at: string;
};

export type SeoIssue = {
  id: string;
  audit_id: string;
  url_check_id: string;
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'success';
  issue_code: string;
  description: string;
  recommendation?: string;
  created_at: string;
};

export type RobotsTxtAnalysis = {
  id: string;
  audit_id: string;
  content: string;
  has_errors: boolean;
  errors?: any[];
  blocked_important_paths?: string[];
  recommendations?: string[];
  corrected_content?: string;
  created_at: string;
};

export type SitemapAnalysis = {
  id: string;
  audit_id: string;
  sitemap_url: string;
  total_urls: number;
  urls_with_errors: number;
  urls_with_noindex: number;
  missing_important_urls?: string[];
  issues?: any[];
  created_at: string;
};

export type ExclusionRule = {
  id: string;
  site_url: string;
  url_pattern: string;
  reason?: string;
  exclude_from_sitemap: boolean;
  created_at: string;
  updated_at: string;
};
