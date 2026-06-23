import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

type Dict = Record<string, { en: string; fr: string }>;

export const DICT: Dict = {
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.artworks": { en: "Artworks", fr: "Œuvres" },
  "nav.exhibitions": { en: "Exhibitions", fr: "Expositions" },
  "nav.community": { en: "Community", fr: "Communauté" },
  "hero.tag": { en: "Vancouver · est. forever", fr: "Vancouver · depuis toujours" },
  "hero.line1": { en: "Art you're", fr: "L'art que vous" },
  "hero.line2": { en: "meant to", fr: "êtes destiné" },
  "hero.line3": { en: "feel.", fr: "à ressentir." },
  "hero.lede": {
    en: "Culturally guided, textured paintings capturing the pain, the strength, the struggle, the beauty, and the excellence of our essence.",
    fr: "Des peintures texturées et culturellement inspirées qui capturent la douleur, la force, la lutte, la beauté et l'excellence de notre essence.",
  },
  "hero.cta1": { en: "Browse the collection", fr: "Voir la collection" },
  "hero.cta2": { en: "Upcoming exhibitions", fr: "Prochaines expositions" },
  "hero.scroll": { en: "Scroll", fr: "Défiler" },
  "about.kicker": { en: "About the artist", fr: "À propos de l'artiste" },
  "about.title": { en: "A craft you can touch.", fr: "Un art que l'on peut toucher." },
  "about.p1": {
    en: "Each one-of-a-kind creation starts with acrylic or oil — but the magic begins with whatever calls Kiyari's name in the craft aisle, fabric store, beauty supply, or home-building outlet.",
    fr: "Chaque création unique commence par l'acrylique ou l'huile — mais la magie naît de tout ce qui interpelle Kiyari dans les rayons de bricolage, tissus, beauté ou matériaux.",
  },
  "about.p2": {
    en: "You will never hear \"please don't touch\" at a Kiyari exhibition.",
    fr: "Vous n'entendrez jamais « ne touchez pas » lors d'une exposition Kiyari.",
  },
  "stat.originals": { en: "Originals", fr: "Originaux" },
  "stat.exhibitions": { en: "Exhibitions", fr: "Expositions" },
  "stat.years": { en: "Years painting", fr: "Années de pratique" },
  "feat.kicker": { en: "Available now", fr: "Disponibles" },
  "feat.title": { en: "Featured works", fr: "Œuvres en vedette" },
  "feat.viewAll": { en: "View all", fr: "Tout voir" },
  "cta.kicker": { en: "Join the network", fr: "Rejoignez le cercle" },
  "cta.title": { en: "Be first to see what comes next.", fr: "Soyez les premiers à découvrir la suite." },
  "cta.lede": {
    en: "New paintings, upcoming exhibitions, studio dispatches — straight to your inbox.",
    fr: "Nouvelles toiles, expositions à venir, nouvelles d'atelier — directement dans votre boîte.",
  },
  "cta.btn": { en: "Get in touch", fr: "Contactez-nous" },
  "art.inquire": { en: "Inquire", fr: "Demander" },
  "art.sold": { en: "Sold", fr: "Vendu" },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT) => string } | null>(null);
const KEY = "kiyari-lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as Lang | null;
      if (stored === "en" || stored === "fr") setLangState(stored);
      else if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("fr")) setLangState("fr");
    } catch {}
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch {}
  };
  const t = (k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k);
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n requires I18nProvider");
  return c;
}
