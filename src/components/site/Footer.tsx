import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative mt-24 border-t border-border">
      <div className="container-page py-10 grid gap-8 md:grid-cols-3 md:items-start">
        <div>
          <div className="font-display text-2xl">art by <span className="text-gradient-gold">KIYARI</span></div>
          <p className="mt-3 text-xs text-muted-foreground max-w-xs">{t("footer.tagline")}</p>
        </div>

        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Studio</div>
          <div className="font-display text-lg text-muted-foreground">Calgary, AB</div>
        </div>

        <div className="md:text-right flex flex-col md:items-end gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Explore</div>
            <ul className="flex flex-col gap-1 text-xs md:items-end">
              <li><Link to="/artworks" className="link-underline">{t("nav.artworks")}</Link></li>
              <li><Link to="/exhibitions" className="link-underline">{t("nav.exhibitions")}</Link></li>
              <li><Link to="/community" className="link-underline">{t("nav.community")}</Link></li>
            </ul>
          </div>
          <div className="md:text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("footer.connect")}</div>
          <div className="flex gap-3 md:justify-end">
            <a href="https://wa.me/17782331921" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold hover:text-gold transition" aria-label="Chat on WhatsApp"><MessageCircle className="h-4 w-4" /></a>
            <a href="mailto:hello@kiyari.art" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold hover:text-gold transition" aria-label="Email Kiyari"><Mail className="h-4 w-4" /></a>
            <a href="https://instagram.com/artbykiyari" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold hover:text-gold transition" aria-label="Kiyari on Instagram"><Instagram className="h-4 w-4" /></a>
          </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Kiyari — {t("footer.rights")}</span>
          <span>
            {t("footer.designedBy")}{" "}
            <a href="https://funnelvista.com" target="_blank" rel="noreferrer" className="text-gold hover:text-foreground transition">Funnel Vista Marketing</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
