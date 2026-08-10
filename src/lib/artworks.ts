export type Artwork = {
  id: string;
  title: string;
  image: string;
  price: number;
  sold: boolean;
  collection: "Our Essence";
  medium?: string;
  description?: string;
  /** Original (pre-sale) list price when `onSale` is true. */
  originalPrice?: number;
  /** True when the piece is on sale and `price` is the discounted sale price. */
  onSale?: boolean;
  /** Shipping cost (CAD) for this specific piece. 0 when unknown. */
  shipping_cad?: number;
};

const w = (url: string) => url;

/**
 * Legacy hardcoded catalog — intentionally EMPTY.
 * All artworks now live in the database (artworks_custom) so admin edits and
 * deletes take effect on the public store immediately.
 */
export const ARTWORKS: Artwork[] = [];

import hero640 from "@/assets/hero-kiyari-v4-640.webp.asset.json";
import hero1024 from "@/assets/hero-kiyari-v4-1024.webp.asset.json";
import hero1400 from "@/assets/hero-kiyari-v4-1400.webp.asset.json";
import heroWide1600 from "@/assets/hero-wide-1600.webp.asset.json";
import heroWide2560 from "@/assets/hero-wide-2560.webp.asset.json";
import heroTall720 from "@/assets/hero-tall-720.webp.asset.json";
import heroTall1080 from "@/assets/hero-tall-1080.webp.asset.json";

export const HERO_IMAGE = heroWide1600.url;
export const HERO_IMAGE_WEBP = heroWide1600.url;
export const HERO_IMAGE_SRCSET = `${hero640.url} 640w, ${hero1024.url} 1024w, ${hero1400.url} 1400w`;
export const HERO_IMAGE_SIZES = "100vw";

/** Landscape (16:9) hero — the photo's own wall extended sideways so it fills wide viewports. */
export const HERO_WIDE_SRC = heroWide1600.url;
export const HERO_WIDE_SRCSET = `${heroWide1600.url} 1600w, ${heroWide2560.url} 2560w`;
/** Portrait (9:16) hero — same photo, wall extended vertically for phones. */
export const HERO_TALL_SRC = heroTall720.url;
export const HERO_TALL_SRCSET = `${heroTall720.url} 720w, ${heroTall1080.url} 1080w`;
/** Natural square (1:1) photo — used uncropped, full-width, on mobile. */
export const HERO_SQUARE_SRC = hero1024.url;
export const HERO_SQUARE_SRCSET = HERO_IMAGE_SRCSET;


export function isArtworkPurchasable(artwork: Pick<Artwork, "sold" | "price">) {
  return !artwork.sold && artwork.price > 0;
}
