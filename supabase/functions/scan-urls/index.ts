import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CrawlResult {
  url: string;
  status: number;
  responseTime: number;
  title?: string;
  metaDescription?: string;
  h1Tags: string[];
  canonicalUrl?: string;
  robotsMeta?: string;
  hasNoindex: boolean;
  hasNofollow: boolean;
  imagesWithoutAlt: number;
  contentLength: number;
  internalLinks: number;
  externalLinks: number;
  hasHttps: boolean;
  mixedContent: boolean;
  inSitemap: boolean;
  robotsAllowed: boolean;
  sitemapRobotsIssues?: string;
}

async function crawlUrl(url: string, sitemapUrls: Set<string>, robotsRules: string[]): Promise<CrawlResult> {
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "SEO-Audit-Bot/1.0" },
      redirect: "follow",
    });

    const responseTime = Math.round(performance.now() - startTime);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const title = doc.querySelector("title")?.textContent || "";
    const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const h1Elements = doc.querySelectorAll("h1");
    const h1Tags = Array.from(h1Elements).map((h1) => h1.textContent?.trim() || "");
    const canonicalUrl = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || undefined;
    const robotsMeta = doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
    const hasNoindex = robotsMeta.toLowerCase().includes("noindex");
    const hasNofollow = robotsMeta.toLowerCase().includes("nofollow");

    const images = doc.querySelectorAll("img");
    const imagesWithoutAlt = Array.from(images).filter((img) => !img.getAttribute("alt")).length;

    const textContent = doc.body?.textContent || "";
    const contentLength = textContent.trim().split(/\s+/).length;

    const links = doc.querySelectorAll("a[href]");
    let internalLinks = 0;
    let externalLinks = 0;
    const urlObj = new URL(url);

    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("http")) {
        try {
          const linkUrl = new URL(href);
          if (linkUrl.hostname === urlObj.hostname) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } catch (e) {
          // Invalid URL
        }
      } else if (!href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
        internalLinks++;
      }
    });

    const hasHttps = url.startsWith("https://");
    const mixedContent = hasHttps && html.includes("http://");

    const inSitemap = sitemapUrls.has(url);

    const urlPath = new URL(url).pathname;
    let robotsAllowed = true;
    for (const rule of robotsRules) {
      if (urlPath.startsWith(rule)) {
        robotsAllowed = false;
        break;
      }
    }

    const issues: string[] = [];
    if (!inSitemap) issues.push("Не найдено в sitemap");
    if (!robotsAllowed) issues.push("Заблокировано в robots.txt");
    if (hasNoindex) issues.push("Имеет noindex");
    if (response.status === 404) issues.push("Ошибка 404");

    return {
      url,
      status: response.status,
      responseTime,
      title,
      metaDescription,
      h1Tags,
      canonicalUrl,
      robotsMeta,
      hasNoindex,
      hasNofollow,
      imagesWithoutAlt,
      contentLength,
      internalLinks,
      externalLinks,
      hasHttps,
      mixedContent,
      inSitemap,
      robotsAllowed,
      sitemapRobotsIssues: issues.length > 0 ? issues.join("; ") : undefined,
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    return {
      url,
      status: 0,
      responseTime,
      h1Tags: [],
      hasNoindex: false,
      hasNofollow: false,
      imagesWithoutAlt: 0,
      contentLength: 0,
      internalLinks: 0,
      externalLinks: 0,
      hasHttps: url.startsWith("https://"),
      mixedContent: false,
      inSitemap: false,
      robotsAllowed: true,
      sitemapRobotsIssues: `Ошибка сканирования: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { audit_id, urls, site_url } = await req.json();

    if (!audit_id || !urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "audit_id and urls array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: sitemapData } = await supabase
      .from("stored_sitemaps")
      .select("url")
      .eq("site_url", site_url);

    const sitemapUrls = new Set((sitemapData || []).map((item: any) => item.url));

    const { data: robotsData } = await supabase
      .from("stored_robots")
      .select("content")
      .eq("site_url", site_url)
      .single();

    const robotsRules: string[] = [];
    if (robotsData?.content) {
      const lines = robotsData.content.split("\n");
      for (const line of lines) {
        if (line.trim().toLowerCase().startsWith("disallow:")) {
          const path = line.split(":")[1]?.trim();
          if (path) robotsRules.push(path);
        }
      }
    }

    const results: CrawlResult[] = [];
    const CONCURRENT_BATCHES = 3;
    const BATCH_SIZE = Math.ceil(urls.length / CONCURRENT_BATCHES);

    const batches = [];
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      batches.push(urls.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch) => {
      const batchResults: CrawlResult[] = [];
      for (const url of batch) {
        const result = await crawlUrl(url, sitemapUrls, robotsRules);
        batchResults.push(result);
      }
      return batchResults;
    });

    const allBatchResults = await Promise.all(batchPromises);
    results.push(...allBatchResults.flat());

    return new Response(
      JSON.stringify({
        success: true,
        audit_id,
        total_scanned: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
