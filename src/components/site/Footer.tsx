import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-32 border-t border-border">
      <div className="container-page py-16 grid gap-12 md:grid-cols-3">
        <div>
          <div className="font-display text-3xl">art by <span className="text-gradient-gold">KIYARI</span></div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs">
            Culturally guided, textured art you are encouraged to <em>feel</em>.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/artworks" className="link-underline">Artworks</Link></li>
            <li><Link to="/exhibitions" className="link-underline">Exhibitions</Link></li>
            <li><Link to="/community" className="link-underline">Community</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Connect</div>
          <div className="flex gap-3">
            <a href="https://wa.me/17782331921" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold hover:text-gold transition" aria-label="WhatsApp"><Mail className="h-4 w-4" /></a>
            <a href="#" className="grid h-10 w-10 place-items-center rounded-full border border-border hover:border-gold hover:text-gold transition" aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page py-6 text-xs text-muted-foreground flex flex-wrap justify-between gap-3">
          <span>© {new Date().getFullYear()} Kiyari — All rights reserved.</span>
          <span>Vancouver, BC · Canada</span>
        </div>
      </div>
    </footer>
  );
}
