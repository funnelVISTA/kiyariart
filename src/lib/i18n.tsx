import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "fr";

type Dict = Record<string, { en: string; fr: string }>;

export const DICT: Dict = {
  // Nav
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.artworks": { en: "Artworks", fr: "Œuvres" },
  "nav.exhibitions": { en: "Exhibitions", fr: "Expositions" },
  "nav.community": { en: "Community", fr: "Communauté" },

  // Hero (home)
  "hero.tag": { en: "Calgary · est. forever", fr: "Calgary · depuis toujours" },
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

  // About
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

  // Featured
  "feat.kicker": { en: "Available now", fr: "Disponibles" },
  "feat.title": { en: "Featured works", fr: "Œuvres en vedette" },
  "feat.viewAll": { en: "View all", fr: "Tout voir" },
  "feat.add": { en: "Add", fr: "Ajouter" },

  // CTA
  "cta.kicker": { en: "Join the network", fr: "Rejoignez le cercle" },
  "cta.title": { en: "Be first to see what comes next.", fr: "Soyez les premiers à découvrir la suite." },
  "cta.lede": {
    en: "New paintings, upcoming exhibitions, studio dispatches — straight to your inbox.",
    fr: "Nouvelles toiles, expositions à venir, nouvelles d'atelier — directement dans votre boîte.",
  },
  "cta.btn": { en: "Get in touch", fr: "Contactez-nous" },

  // Artwork shared
  "art.inquire": { en: "Inquire", fr: "Sur demande" },
  "art.sold": { en: "Sold", fr: "Vendu" },
  "art.available": { en: "Available", fr: "Disponible" },
  "art.priceOnRequest": { en: "Price on request", fr: "Prix sur demande" },
  "art.addToCart": { en: "Add to cart", fr: "Ajouter au panier" },
  "art.addedToast": { en: "added", fr: "ajouté" },
  "art.addedDesc": { en: "Open cart to checkout securely.", fr: "Ouvrez le panier pour passer à la caisse." },
  "art.soldToast": { en: "This piece is sold", fr: "Cette œuvre est vendue" },
  "art.soldDesc": { en: "Reach out to commission something similar.", fr: "Contactez-nous pour une commande similaire." },

  // Artworks page
  "artworks.kicker": { en: "The collection", fr: "La collection" },
  "artworks.title1": { en: "Originals,", fr: "Originaux," },
  "artworks.title2": { en: "one of one.", fr: "uniques." },
  "artworks.lede": {
    en: "Each piece is hand-made with acrylic, oil, and a wandering palette of textures. Add a painting to your cart to request an invoice — Kiyari personally confirms each sale.",
    fr: "Chaque pièce est faite à la main avec acrylique, huile et une palette de textures. Ajoutez une œuvre au panier pour demander une facture — Kiyari confirme personnellement chaque vente.",
  },
  "artworks.filter.all": { en: "All", fr: "Tout" },
  "artworks.filter.available": { en: "Available", fr: "Disponibles" },
  "artworks.filter.essence": { en: "Our Essence", fr: "Notre Essence" },
  "artworks.filter.legends": { en: "Legends", fr: "Légendes" },
  "artworks.filter.sold": { en: "Archive", fr: "Archives" },
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

  // Exhibitions
  "ex.kicker": { en: "Live shows & moments", fr: "Expositions et moments" },
  "ex.title1": { en: "See it", fr: "À voir" },
  "ex.title2": { en: "in person.", fr: "en personne." },
  "ex.upcoming": { en: "Upcoming", fr: "À venir" },
  "ex.past": { en: "Past collections", fr: "Collections passées" },
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
  "com.title2": { en: "connect.", fr: "en contact." },
  "com.lede": {
    en: "Commissions, collaborations, press, or simply to say hello — Kiyari reads every message.",
    fr: "Commandes, collaborations, presse, ou simplement pour dire bonjour — Kiyari lit chaque message.",
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
  "footer.tagline": { en: "Culturally guided, textured art you are encouraged to feel.", fr: "Art texturé et culturellement guidé, que vous êtes invité à ressentir." },
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
