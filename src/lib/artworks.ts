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

export const ARTWORKS: Artwork[] = [
  { id: "shower-her", title: "Shower Her", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/shower%20her.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "fierce", title: "Fierce", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/firece2.jpg/:/rs=w:1200,cg:true,m"), price: 1800, sold: false, collection: "Our Essence" },
  { id: "daddys-girl", title: "Daddy's Girl", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/image2%20(3).jpeg/:/rs=w:1200,cg:true,m"), price: 1400, sold: false, collection: "Our Essence" },
  { id: "underneath-it-all", title: "Underneath It All", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/image0%20(8)-1d99adf.jpeg/:/rs=w:1200,cg:true,m"), price: 1500, sold: false, collection: "Our Essence" },
  { id: "reign", title: "Reign", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/image0%20(8).jpeg/:/rs=w:1200,cg:true,m"), price: 1700, sold: false, collection: "Our Essence" },
  { id: "madiba", title: "Madiba", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Madiba.jpeg/:/rs=w:1200,cg:true,m"), price: 2200, sold: false, collection: "Our Essence" },
  { id: "raising-a-king", title: "Raising a King", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Raising%20a%20King.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "nnamdi", title: "Nnamdi", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Nnamdi.jpg/:/rs=w:1200,cg:true"), price: 0, sold: true, collection: "Our Essence" },
  { id: "warrior-queen", title: "Warrior Queen", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG-2538.jpg/:/rs=w:1200,cg:true,m"), price: 1900, sold: false, collection: "Our Essence" },
  { id: "tree-of-life", title: "Tree of Life", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG-7136.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "mother-africa", title: "Mother Africa", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG-7199-19f763a.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "confidence", title: "Confidence", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG-7172-45d3fc4.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "serenitys-garden", title: "Serenity's Garden", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG-7171.jpg/:/rs=w:1200,cg:true,m"), price: 1500, sold: false, collection: "Our Essence" },
  { id: "kingston", title: "Kingston", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/rasta.jpg/:/rs=w:1200,cg:true"), price: 1300, sold: false, collection: "Our Essence" },
  { id: "dancing-butterflies", title: "Dancing Butterflies", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Dancing%20Butterflies.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "the-struggle", title: "The Struggle", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/unnamed.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "strength-of-a-woman", title: "Strength of a Woman", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/image5.jpeg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence", description: "Gifted to Sisters in Canada Wellness Society" },
  { id: "carnival-queen", title: "Carnival Queen", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/image2.jpeg/:/rs=w:1200,cg:true,m"), price: 1600, sold: false, collection: "Our Essence" },
  { id: "pretty-in-pink", title: "Pretty in Pink", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/IMG_8603.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "soul-sisters", title: "Soul Sisters", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Soul%20Sisters.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "war-child", title: "War Child", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/War%20Child.jpg/:/rs=w:1200,cg:true,m"), price: 0, sold: true, collection: "Our Essence" },
  { id: "prince", title: "Prince", image: w("https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Madiba.jpeg/:/rs=w:1200,cg:true,m"), price: 2400, sold: false, collection: "Our Essence" },
];

import hero640 from "@/assets/hero-kiyari-v4-640.webp.asset.json";
import hero1024 from "@/assets/hero-kiyari-v4-1024.webp.asset.json";
import hero1400 from "@/assets/hero-kiyari-v4-1400.webp.asset.json";

export const HERO_IMAGE = hero1400.url;
export const HERO_IMAGE_WEBP = hero1400.url;
export const HERO_IMAGE_SRCSET = `${hero640.url} 640w, ${hero1024.url} 1024w, ${hero1400.url} 1400w`;
export const HERO_IMAGE_SIZES = "100vw";


export function isArtworkPurchasable(artwork: Pick<Artwork, "sold" | "price">) {
  return !artwork.sold && artwork.price > 0;
}
