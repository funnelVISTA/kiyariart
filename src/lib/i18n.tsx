import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

type Dict = Record<string, { en: string; fr: string }>;

export const DICT: Dict = {
  // Nav
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.artworks": { en: "Artworks", fr: "Œuvres" },
  "nav.exhibitions": { en: "Events", fr: "Événements" },
  "nav.community": { en: "Community", fr: "Communauté" },

  // Hero (home)
  "hero.line1": { en: "Bold Colours, Fearless", fr: "Couleurs audacieuses, textures" },
  "hero.line2": { en: "Textures & Stories", fr: "intrépides et histoires" },
  "hero.line3a": { en: "You Can ", fr: "que vous pouvez " },
  "hero.line3b": { en: "Feel", fr: "Ressentir" },
  "hero.lede": {
    en: "Kiyari creates vibrant, stand-out pieces\nthat merge abstract expression with tactile elements\n— to honour the depth and brilliance of our culture.",
    fr: "Kiyari crée des œuvres afrocentriques vibrantes et remarquables qui fusionnent l'expression abstraite et des éléments tactiles — pour honorer la profondeur et l'éclat de notre culture.",
  },
  "hero.cta1": { en: "Shop Collection", fr: "Magasiner la collection" },
  "hero.cta2": { en: "Upcoming events", fr: "Prochains événements" },
  "hero.scroll": { en: "Scroll", fr: "Défiler" },

  // About
  "about.kicker": { en: "About the artist", fr: "À propos de l'artiste" },
  "about.title": { en: "A craft you can touch.", fr: "Un art que l'on peut toucher." },
  "about.p1": {
    en: "Kiyari discovered painting in adulthood, at a time when she needed space to breathe. What began as a therapeutic outlet soon became a deeply personal form of healing.",
    fr: "Kiyari a découvert la peinture à l'âge adulte, à un moment où elle avait besoin d'espace pour respirer. Ce qui a commencé comme un exutoire thérapeutique est vite devenu une forme profondément personnelle de guérison.",
  },
  "about.p2": {
    en: "She blends traditional art mediums with whatever calls to her spirit — found in the craft aisle, fabric store, beauty supply, and beyond — transforming them into richly textured artworks.",
    fr: "Elle mêle les médiums traditionnels à tout ce qui appelle son esprit — trouvé dans les rayons de bricolage, tissus, beauté et au-delà — pour les transformer en œuvres richement texturées.",
  },
  "about.p3a": {
    en: "Her process is intuitive and fearless, with a refusal to color inside the lines. Kiyari's artworks welcome you closer. You are encouraged to run your fingers across the textures, to experience the emotion, and ",
    fr: "Sa démarche est intuitive et intrépide, refusant de rester dans les lignes. Les œuvres de Kiyari vous invitent à vous approcher. Vous êtes encouragé à parcourir les textures du bout des doigts, à ressentir l'émotion et à ",
  },
  "about.p3b": { en: "FEEL", fr: "RESSENTIR" },
  "about.p3c": { en: " the story.", fr: " l'histoire." },
  "about.p4": {
    en: "You will never hear \"don't touch\" with a Kiyari creation.",
    fr: "Vous n'entendrez jamais « ne touchez pas » avec une création de Kiyari.",
  },
  // Featured
  "feat.kicker": { en: "Available now", fr: "Disponibles" },
  "feat.title": { en: "Featured works", fr: "Œuvres en vedette" },
  "feat.viewAll": { en: "View all", fr: "Tout voir" },
  "feat.add": { en: "Add", fr: "Ajouter" },

  // CTA
  "cta.kicker": { en: "Connect", fr: "Connecter" },
  "cta.title": { en: "Be first to see what comes next.", fr: "Soyez les premiers à découvrir la suite." },
  "cta.lede": {
    en: "New paintings, upcoming exhibitions, studio dispatches — straight to your inbox.",
    fr: "Nouvelles toiles, expositions à venir, nouvelles d'atelier — directement dans votre boîte.",
  },
  "cta.btn": { en: "Get in touch", fr: "Contactez-nous" },
  "cta.commission": {
    en: "Interested in a custom piece? Mention your vision when you reach out — Kiyari accepts commissions.",
    fr: "Intéressé par une pièce sur mesure? Mentionnez votre vision lorsque vous écrivez — Kiyari accepte les commissions.",
  },

  // Artwork shared
  "art.sold": { en: "Sold", fr: "Vendu" },
  "art.available": { en: "Available", fr: "Disponible" },
  "art.addToCart": { en: "Add to cart", fr: "Ajouter au panier" },
  "art.addedToast": { en: "added", fr: "ajouté" },
  "art.addedDesc": { en: "Open cart to checkout securely.", fr: "Ouvrez le panier pour passer à la caisse." },
  "art.soldToast": { en: "This piece is sold", fr: "Cette œuvre est vendue" },
  "art.soldDesc": { en: "Each piece is one of one.", fr: "Chaque pièce est unique." },

  // Artworks page
  "artworks.kicker": { en: "The collection", fr: "La collection" },
  "artworks.title1": { en: "Originals,", fr: "Originaux," },
  "artworks.title2": { en: "One of One", fr: "Uniques" },
  "artworks.lede": {
    en: "Each one-of-a-kind piece is a living narrative — a celebration of resilience, a confrontation of pain, a declaration of beauty, and a testament to freedom. Kiyari creations are not just artworks; they are moments of healing made visible. Let the piece choose you, check out securely, and Kiyari will personally ship the creation to its new home.",
    fr: "Chaque pièce unique est un récit vivant — une célébration de la résilience, une confrontation avec la douleur, une déclaration de beauté et un témoignage de liberté. Les créations de Kiyari ne sont pas de simples œuvres ; ce sont des moments de guérison rendus visibles. Laissez la pièce vous choisir, passez commande en toute sécurité, et Kiyari expédiera personnellement la création vers son nouveau foyer.",
  },

  "artworks.filter.all": { en: "All", fr: "Tout" },
  "artworks.filter.available": { en: "Available", fr: "Disponibles" },
  "artworks.filter.essence": { en: "Our Essence", fr: "Notre Essence" },
  "artworks.filter.legends": { en: "Legends", fr: "Légendes" },
  "artworks.filter.sold": { en: "Sold", fr: "Vendues" },
  "artworks.details": {
    en: "Acrylic, oil & mixed media on canvas. Signed by the artist. Each piece is unique and ships fully insured from Calgary, AB.",
    fr: "Acrylique, huile et techniques mixtes sur toile. Signée par l'artiste. Chaque pièce est unique et expédiée entièrement assurée depuis Calgary, AB.",
  },
  "artworks.blurb.legend": {
    en: "honours an icon — rendered in acrylic, oil & mixed media with hand-built texture.",
    fr: "rend hommage à une icône — réalisé en acrylique, huile et techniques mixtes avec une texture sculptée à la main.",
  },
  "artworks.blurb.essence": {
    en: "from Our Essence. Layered acrylic, oil & mixed media on canvas, signed by the artist.",
    fr: "de Notre Essence. Acrylique, huile et techniques mixtes superposées sur toile, signée par l'artiste.",
  },

  // Events
  "ex.kicker": { en: "Live events & moments", fr: "Événements et moments" },
  "ex.title1": { en: "See it", fr: "À voir" },
  "ex.title2": { en: "in person.", fr: "en personne." },
  "ex.upcoming": { en: "Upcoming events", fr: "Événements à venir" },
  "ex.past": { en: "Past events", fr: "Événements passés" },
  "ex.gallery": { en: "Gallery", fr: "Galerie" },
  "ex.details": { en: "Event details →", fr: "Détails de l'événement →" },
  "ex.prev": { en: "Prev", fr: "Préc." },
  "ex.next": { en: "Next", fr: "Suivant" },
  "ex.event1.title": { en: "Wordsmith — A Night of Poetry", fr: "Wordsmith — Une nuit de poésie" },
  "ex.event1.blurb": {
    en: "A night of Black excellence experienced through the arts. Storytelling from some of Vancouver's most talented voices, alongside a live painting reveal.",
    fr: "Une nuit d'excellence noire vécue à travers les arts. Récits des voix les plus talentueuses de Vancouver, accompagnés d'une création de peinture en direct.",
  },

  // Community
  "com.kicker": { en: "Community", fr: "Communauté" },
  "com.title1": { en: "Let's", fr: "Restons" },
  "com.title2": { en: "Connect", fr: "en contact" },
  "com.lede": {
    en: "Kiyari personally reads every message.",
    fr: "Kiyari lit personnellement chaque message.",
  },
  "com.name": { en: "Name", fr: "Nom" },
  "com.email": { en: "Email", fr: "Courriel" },
  "com.message": { en: "Message", fr: "Message" },
  "com.name.ph": { en: "Your full name", fr: "Votre nom complet" },
  "com.email.ph": { en: "you@somewhere.com", fr: "vous@quelquepart.com" },
  "com.message.ph": { en: "Tell Kiyari what's on your mind…", fr: "Dites à Kiyari ce que vous avez à l'esprit…" },
  "com.subscribe": { en: "Subscribe to studio updates & exhibition invites", fr: "Recevez les nouvelles de l'atelier et invitations aux expositions" },
  "com.send": { en: "Send message", fr: "Envoyer le message" },
  "com.sending": { en: "Sending…", fr: "Envoi…" },
  "com.sent": { en: "Message sent", fr: "Message envoyé" },
  "com.sentDesc": { en: "Kiyari will be in touch soon.", fr: "Kiyari vous contactera bientôt." },
  "com.err.name": { en: "Please share your name", fr: "Veuillez indiquer votre nom" },
  "com.err.email": { en: "Please enter a valid email", fr: "Veuillez saisir un courriel valide" },
  "com.err.message": { en: "A few more words…", fr: "Quelques mots de plus…" },
  "com.studio": { en: "Studio", fr: "Atelier" },
  "com.studio.loc": { en: "Calgary, AB", fr: "Calgary, AB" },
  "com.studio.note": { en: "Visits by appointment. Mention your favourite piece when you write.", fr: "Visites sur rendez-vous. Mentionnez votre œuvre préférée en écrivant." },
  "com.supporters.kicker": { en: "With gratitude to", fr: "Avec gratitude envers" },
  "com.supporters.title": { en: "Our supporters", fr: "Nos soutiens" },
  "com.supporters.lede": { en: "Communities, organizations, and collectors who help carry this work forward.", fr: "Communautés, organisations et collectionneurs qui portent ce travail." },
  "com.news.kicker": { en: "Newsletter", fr: "Infolettre" },
  "com.news.title": { en: "Stay in the loop", fr: "Restez informé" },
  "com.news.lede": { en: "New artworks, exhibitions, studio dispatches.", fr: "Nouvelles œuvres, expositions, nouvelles d'atelier." },
  "com.news.name.ph": { en: "Name (optional)", fr: "Nom (facultatif)" },
  "com.news.email.ph": { en: "you@email.com", fr: "vous@courriel.com" },
  "com.news.subscribe": { en: "Subscribe", fr: "S'abonner" },
  "com.news.subscribing": { en: "Subscribing…", fr: "Inscription…" },
  "com.news.subscribed": { en: "Subscribed ✓", fr: "Inscrit ✓" },
  "com.news.toast": { en: "Subscribed", fr: "Inscription confirmée" },
  "com.news.toastDesc": { en: "You'll hear about new artworks & exhibitions.", fr: "Vous recevrez les nouvelles œuvres et expositions." },

  // Footer
  "footer.tagline": { en: "Bold Colours, Fearless Textures & Stories You Can Feel.", fr: "Couleurs audacieuses, textures intrépides et histoires que vous pouvez ressentir." },
  "footer.explore": { en: "Explore", fr: "Explorer" },
  "footer.connect": { en: "Connect", fr: "Connecter" },
  "footer.studioLink": { en: "Studio", fr: "Atelier" },
  "footer.location": { en: "Calgary, AB · Canada", fr: "Calgary, AB · Canada" },
  "footer.rights": { en: "All rights reserved.", fr: "Tous droits réservés." },
  "footer.designedBy": { en: "Site designed by", fr: "Site conçu par" },
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
