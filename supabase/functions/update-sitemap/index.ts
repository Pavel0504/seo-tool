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

    const { site_url, sitemap_xml_url } = await req.json();

    if (!site_url || !sitemap_xml_url) {
      return new Response(
        JSON.stringify({ error: "site_url and sitemap_xml_url are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sitemapResponse = await fetch(sitemap_xml_url);
    if (!sitemapResponse.ok) {
      throw new Error(`Failed to fetch sitemap: ${sitemapResponse.statusText}`);
    }

    const sitemapXml = await sitemapResponse.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(sitemapXml, "text/xml");

    await supabase.from("stored_sitemaps").delete().eq("site_url", site_url);

    const sitemapEntries: Array<{
      site_url: string;
      category: string;
      url: string;
      lastmod?: string;
      priority?: string;
      changefreq?: string;
    }> = [];

    const sitemapIndexUrls = doc.querySelectorAll("sitemapindex > sitemap > loc");

    if (sitemapIndexUrls.length > 0) {
      for (const locElement of sitemapIndexUrls) {
        const childSitemapUrl = locElement.textContent;
        if (!childSitemapUrl) continue;

        try {
          const childResponse = await fetch(childSitemapUrl);
          if (!childResponse.ok) continue;

          const childXml = await childResponse.text();
          const childDoc = parser.parseFromString(childXml, "text/xml");
          const urlElements = childDoc.querySelectorAll("url > loc");

          let category = "other";
          if (childSitemapUrl.includes("products")) category = "products";
          else if (childSitemapUrl.includes("categories")) category = "categories";
          else if (childSitemapUrl.includes("brands") || childSitemapUrl.includes("manufacturers")) category = "manufacturers";
          else if (childSitemapUrl.includes("info")) category = "information";

          for (const urlEl of urlElements) {
            const url = urlEl.textContent;
            if (!url) continue;

            const parent = urlEl.parentElement;
            const lastmod = parent?.querySelector("lastmod")?.textContent || null;
            const priority = parent?.querySelector("priority")?.textContent || "0.5";
            const changefreq = parent?.querySelector("changefreq")?.textContent || "weekly";

            sitemapEntries.push({
              site_url,
              category,
              url,
              lastmod: lastmod || new Date().toISOString().split('T')[0],
              priority,
              changefreq,
            });
          }
        } catch (err) {
          console.error(`Error processing child sitemap ${childSitemapUrl}:`, err);
        }
      }
    } else {
      const urlElements = doc.querySelectorAll("url > loc");

      for (const urlEl of urlElements) {
        const url = urlEl.textContent;
        if (!url) continue;

        const parent = urlEl.parentElement;
        const lastmod = parent?.querySelector("lastmod")?.textContent || null;
        const priority = parent?.querySelector("priority")?.textContent || "0.5";
        const changefreq = parent?.querySelector("changefreq")?.textContent || "weekly";

        sitemapEntries.push({
          site_url,
          category: "other",
          url,
          lastmod: lastmod || new Date().toISOString().split('T')[0],
          priority,
          changefreq,
        });
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
