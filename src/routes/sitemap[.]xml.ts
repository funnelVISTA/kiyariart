import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { ARTWORKS } from "@/lib/artworks";
import { SITE_URL } from "@/lib/site-config";
import { slugify } from "@/lib/slug";

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: string };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/artworks", changefreq: "weekly", priority: "0.9" },
          { path: "/events", changefreq: "weekly", priority: "0.8" },
          { path: "/community", changefreq: "monthly", priority: "0.6" },
        ];

        for (const a of ARTWORKS) {
          entries.push({ path: "/artworks/" + a.id, changefreq: "monthly", priority: "0.7" });
        }

        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const key =
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
          const sb = createClient(url, key, { auth: { persistSession: false } });
          try {
            const [{ data: customs }, { data: overrides }] = await Promise.all([
              sb.from("artworks_custom").select("id,title,created_at"),
              sb.from("artwork_catalog_overrides").select("artwork_id,deleted"),
            ]);
            const deleted = new Set(
              (overrides ?? []).filter((r: any) => r.deleted).map((r: any) => r.artwork_id),
            );
            for (let i = entries.length - 1; i >= 4; i--) {
              const m = entries[i].path.match(/^\/artworks\/(.+)$/);
              if (m && deleted.has(m[1])) entries.splice(i, 1);
            }
            for (const r of customs ?? []) {
              const s = slugify(((r as any).title ?? "") as string);
              if (s) {
                entries.push({
                  path: "/artworks/" + s,
                  lastmod: ((r as any).created_at ?? "").slice(0, 10) || undefined,
                  changefreq: "monthly",
                  priority: "0.7",
                });
              }
            }
          } catch {
            // fall through with catalog-only sitemap
          }
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...entries.map((e) =>
            [
              "  <url>",
              "    <loc>" + SITE_URL + e.path + "</loc>",
              e.lastmod ? "    <lastmod>" + e.lastmod + "</lastmod>" : null,
              e.changefreq ? "    <changefreq>" + e.changefreq + "</changefreq>" : null,
              e.priority ? "    <priority>" + e.priority + "</priority>" : null,
              "  </url>",
            ]
              .filter(Boolean)
              .join("\n"),
          ),
          "</urlset>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});