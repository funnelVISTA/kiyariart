import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { absUrl } from "@/lib/site-config";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /admin/",
          "Disallow: /auth",
          "Disallow: /account",
          "Disallow: /checkout",
          "Disallow: /reset-password",
          "Disallow: /api/",
          "Disallow: /lovable/",
          "",
          "Sitemap: " + absUrl("/sitemap.xml"),
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});