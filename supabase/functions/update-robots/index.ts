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

    const { site_url, robots_txt_url } = await req.json();

    if (!site_url || !robots_txt_url) {
      return new Response(
        JSON.stringify({ error: "site_url and robots_txt_url are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const robotsResponse = await fetch(robots_txt_url);
    if (!robotsResponse.ok) {
      throw new Error(`Failed to fetch robots.txt: ${robotsResponse.statusText}`);
    }

    const robotsContent = await robotsResponse.text();

    await supabase.from("stored_robots").delete().eq("site_url", site_url);

    const { error } = await supabase.from("stored_robots").insert({
      site_url,
      content: robotsContent,
      fetched_at: new Date().toISOString(),
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        site_url,
        content_length: robotsContent.length,
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
