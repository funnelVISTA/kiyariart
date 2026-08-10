import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ARTWORKS, isArtworkPurchasable, type Artwork } from "@/lib/artworks";
import { supabase } from "@/integrations/supabase/client";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { absUrl, canonical } from "@/lib/site-config";
import { slugify } from "@/lib/slug";
import { listArtworkAvailability } from "@/lib/payments.functions";

type Detail = {
  slug: string;
  title: string;
  description: string | null;
  medium: string | null;
  image: string;
  alt: string;
  price: number;
  originalPrice: number | null;
  onSale: boolean;
  sold: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

async function loadArtwork(slug: string): Promise<Detail> {
  const cat = ARTWORKS.find((a) => a.id === slug);
  if (cat) {
    const { data: ov } = await supabase
      .from("artwork_catalog_overrides")
      .select(
        "title,description,medium,image_url,alt_text,seo_title,seo_description,price_override,on_sale,sale_price,deleted",
      )
      .eq("artwork_id", slug)
      .maybeSingle();
    if (ov && (ov as any).deleted) throw notFound();
    const list = ((ov as any)?.price_override ?? cat.price) as number;
    const onSale = !!(ov as any)?.on_sale && (ov as any)?.sale_price != null;
    const sale = onSale ? Number((ov as any).sale_price) : null;
    const effective = onSale && sale != null ? sale : list;
    const { data: soldRow } = await supabase
      .from("sold_artworks")
      .select("artwork_id")
      .eq("artwork_id", slug)
      .maybeSingle();
    return {
      slug,
      title: (ov as any)?.title ?? cat.title,
      description: (ov as any)?.description ?? cat.description ?? null,
      medium: (ov as any)?.medium ?? cat.medium ?? null,
      image: (ov as any)?.image_url ?? cat.image,
      alt: (ov as any)?.alt_text ?? cat.title,
      price: effective,
      originalPrice: onSale ? list : null,
      onSale: onSale && sale != null && sale < list,
      sold: cat.sold || !!soldRow,
      seoTitle: (ov as any)?.seo_title ?? null,
      seoDescription: (ov as any)?.seo_description ?? null,
    };
  }

  const { data: customs } = await supabase
    .from("artworks_custom")
    .select("id,title,description,price,image_url,medium,sold,alt_text,on_sale,sale_price");
  const row = (customs ?? []).find((r: any) => slugify(r.title ?? "") === slug);
  if (!row) throw notFound();
  const list = Number((row as any).price ?? 0);
  const onSale = !!(row as any).on_sale && (row as any).sale_price != null;
  const sale = onSale ? Number((row as any).sale_price) : null;
  const effective = onSale && sale != null ? sale : list;
  return {
    slug,
    title: (row as any).title,
    description: (row as any).description ?? null,
    medium: (row as any).medium ?? null,
    image: (row as any).image_url,
    alt: (row as any).alt_text ?? (row as any).title,
    price: effective,
    originalPrice: onSale ? list : null,
    onSale: onSale && sale != null && sale < list,
    sold: !!(row as any).sold,
    seoTitle: null,
    seoDescription: null,
  };
}

export const detailQuery = (slug: string) => ({
  queryKey: ["artwork-detail", slug] as const,
  queryFn: () => loadArtwork(slug),
  staleTime: 60_000,
});

export const Route = createFileRoute("/artworks/$slug")({
  ssr: false,
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(detailQuery(params.slug)),
  head: ({ params, loaderData }) => {
    const d = loaderData as Detail | undefined;
    const path = "/artworks/" + params.slug;
    if (!d) {
      return {
        meta: [{ title: "Artwork — art by Kiyari" }, { name: "robots", content: "noindex" }],
        links: [canonical(path)],
      };
    }
    const rawTitle = d.seoTitle || d.title + " — Original Painting by Kiyari";
    const title = rawTitle.length > 60 ? rawTitle.slice(0, 57).trimEnd() + "…" : rawTitle;
    const rawDesc =
      d.seoDescription ||
      d.title +
        (d.medium ? ", " + d.medium : "") +
        " — a one-of-a-kind original by Kiyari (Calgary)." +
        (d.sold ? " Sold." : d.price > 0 ? " CAD $" + d.price.toLocaleString() + "." : "");
    const description =
      rawDesc.length > 160 ? rawDesc.slice(0, 157).trimEnd() + "…" : rawDesc;
    const jsonld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: d.title,
      image: d.image,
      description: rawDesc,
      brand: { "@type": "Brand", name: "Kiyari" },
      category: "Fine Art / Painting",
      url: absUrl(path),
    };
    if (d.price > 0) {
      jsonld.offers = {
        "@type": "Offer",
        price: d.price,
        priceCurrency: "CAD",
        availability: d.sold
          ? "https://schema.org/SoldOut"
          : "https://schema.org/InStock",
        url: absUrl(path),
      };
    }
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: absUrl(path) },
        { property: "og:image", content: d.image },
        { name: "twitter:image", content: d.image },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [canonical(path)],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonld) }],
    };
  },
  component: ArtworkDetailPage,
  notFoundComponent: () => (
    <div className="pt-40 pb-20 container-page text-center">
      <h1 className="font-display text-5xl">Artwork not found</h1>
      <p className="mt-4 text-muted-foreground">This piece may have been removed.</p>
      <Link
        to="/artworks"
        className="mt-6 inline-block bg-gradient-gold px-6 py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground"
      >
        Back to artworks
      </Link>
    </div>
  ),
});

function ArtworkDetailPage() {
  const { slug } = Route.useParams();
  const { data: d } = useQuery(detailQuery(slug));
  const { data: availability } = useQuery({
    queryKey: ["artwork-availability"],
    queryFn: () => listArtworkAvailability(),
    staleTime: 60_000,
  });
  const { add, has } = useCart();
  if (!d) return null;
  const availOverride = new Set(availability?.availableOverrideIds ?? []);
  const soldFromServer = new Set(availability?.soldIds ?? []);
  const isSold = availOverride.has(d.slug) ? false : d.sold || soldFromServer.has(d.slug);
  const artworkForCart: Artwork = {
    id: d.slug,
    title: d.title,
    image: d.image,
    price: d.price,
    sold: isSold,
    collection: "Our Essence",
    medium: d.medium ?? undefined,
    description: d.description ?? undefined,
    originalPrice: d.originalPrice ?? undefined,
    onSale: d.onSale,
  };
  const canBuy = isArtworkPurchasable(artworkForCart);
  return (
    <div className="pt-32 pb-24">
      <div className="container-page">
        <Link
          to="/artworks"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition"
        >
          <ArrowLeft className="h-3 w-3" /> All artworks
        </Link>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div className="relative bg-card border border-border overflow-hidden">
            <img
              src={d.image}
              alt={d.alt}
              className="w-full h-auto object-contain"
              loading="eager"
              decoding="async"
            />
            {isSold && (
              <div className="absolute top-4 right-4 px-3 py-1 text-[10px] uppercase tracking-[0.25em] bg-background/90 border border-border">
                Sold
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-5xl text-gradient-gold leading-tight">
              {d.title}
            </h1>
            {d.medium && (
              <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {d.medium}
              </p>
            )}
            {d.price > 0 && (
              <div className="mt-6 text-lg text-gold">
                {d.onSale && d.originalPrice ? (
                  <>
                    <span className="line-through text-muted-foreground mr-2 opacity-70">
                      ${d.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-accent">${d.price.toLocaleString()}</span>{" "}
                    <span className="text-xs opacity-60">CAD</span>
                  </>
                ) : (
                  <>
                    ${d.price.toLocaleString()}{" "}
                    <span className="text-xs opacity-60">CAD</span>
                  </>
                )}
              </div>
            )}
            {d.description && (
              <p className="mt-6 text-sm md:text-base text-foreground/85 leading-relaxed max-w-prose">
                {d.description}
              </p>
            )}
            {canBuy && (
              <div className="mt-8">
                <AddToCartButton
                  onAdd={() => {
                    add(artworkForCart);
                    toast.success(d.title + " added to cart");
                  }}
                  inCart={has(d.slug)}
                  label="Add to cart"
                  size="md"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}