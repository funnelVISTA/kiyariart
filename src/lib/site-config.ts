/**
 * Central SEO / site config. Change the base URL by setting `VITE_SITE_URL`
 * in `.env` (e.g. move to https://kiyari.ca) — canonicals, og:url, and the
 * sitemap all read from here so there is nothing to grep-and-replace.
 */
const RAW = (import.meta as any).env?.VITE_SITE_URL as string | undefined;

export const SITE_URL = (RAW && RAW.trim().length > 0 ? RAW.trim() : "https://kiyari.art").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "art by Kiyari";
export const SITE_TAGLINE = "Bold Afrocentric Textured Originals — Calgary";

/** Absolute URL for a path. */
export const absUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Canonical link helper for TanStack route head(). */
export const canonical = (path = "/") => ({ rel: "canonical", href: absUrl(path) });

/** Default Organization / LocalBusiness schema; injected in __root.tsx. */
export const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness", "VisualArtsBusiness"],
  name: SITE_NAME,
  alternateName: "Kiyari Art",
  url: SITE_URL,
  logo: absUrl("/favicon.ico"),
  image:
    "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/cdc92eec-9a72-4235-993e-450e4b44477e",
  description:
    "Vibrant, stand-out Afrocentric originals by Kiyari, merging abstract expression with tactile elements — Calgary.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Calgary",
    addressRegion: "AB",
    addressCountry: "CA",
  },
  areaServed: "CA",
  sameAs: [] as string[],
};