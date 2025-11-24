import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { site_url, urls_json_url } = await req.json();

    if (!site_url || !urls_json_url) {
      return new Response(
        JSON.stringify({ error: "site_url and urls_json_url are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const urlsResponse = await fetch(urls_json_url);
    if (!urlsResponse.ok) {
      throw new Error(`Failed to fetch URLs: ${urlsResponse.statusText}`);
    }

    const urlsData = await urlsResponse.json();

    await supabase.from("stored_sitemaps").delete().eq("site_url", site_url);

    const sitemapEntries: Array<{
      site_url: string;
      category: string;
      url: string;
      lastmod?: string;
      priority?: string;
      changefreq?: string;
    }> = [];

    if (urlsData.urls) {
      for (const [category, items] of Object.entries(urlsData.urls)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            const url = typeof item === "string" ? item : item.url;
            const date_modified = typeof item === "object" ? item.date_modified : null;

            if (url) {
              sitemapEntries.push({
                site_url,
                category: category as string,
                url,
                lastmod: date_modified || new Date().toISOString().split('T')[0],
                priority: category === "products" ? "0.8" : "0.6",
                changefreq: category === "products" ? "daily" : "weekly",
              });
            }
          }
        }
      }
    }

    if (sitemapEntries.length > 0) {
      const BATCH_SIZE = 1000;
      for (let i = 0; i < sitemapEntries.length; i += BATCH_SIZE) {
        const batch = sitemapEntries.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("stored_sitemaps").insert(batch);
        if (error) throw error;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        site_url,
        total_urls: sitemapEntries.length,
        updated_at: new Date().toISOString(),
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
