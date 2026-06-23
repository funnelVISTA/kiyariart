import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { ARTWORKS, HERO_IMAGE } from "@/lib/artworks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "art by KIYARI — Original Mixed-Media Paintings" },
      { name: "description", content: "Culturally guided, textured fine art by Kiyari. Browse originals, upcoming exhibitions, and the artist's community." },
      { property: "og:title", content: "art by KIYARI" },
      { property: "og:description", content: "Culturally guided, textured fine art you're encouraged to feel." },
      { property: "og:image", content: HERO_IMAGE },
      { name: "twitter:image", content: HERO_IMAGE },
    ],
  }),
  component: Home,
});

function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const featured = ARTWORKS.filter((a) => !a.sold).slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-hero noise">
        <motion.div
          style={{ scale, y }}
          className="absolute inset-0 z-0"
        >
          <img
            src={HERO_IMAGE}
            alt="Unbothered — featured painting by Kiyari"
            className="h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40" />
        </motion.div>

        <motion.div style={{ opacity }} className="relative z-10 container-page min-h-screen flex flex-col justify-end pb-24 pt-40">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="max-w-3xl"
          >
            <div className="text-xs uppercase tracking-[0.4em] text-gold mb-6">
              — Vancouver · est. forever
            </div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.95]">
              Art you're<br />
              meant to<br />
              <span className="italic text-gradient-gold">feel.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Culturally guided, textured paintings capturing the pain, the strength, the
              struggle, the beauty, and the excellence of our essence.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/artworks" className="group inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
                Browse the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/exhibitions" className="inline-flex items-center gap-3 border border-border px-8 py-4 text-sm uppercase tracking-[0.2em] hover:border-gold hover:text-gold transition">
                Upcoming exhibitions
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
        >
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            Scroll
          </motion.span>
        </motion.div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-border bg-card/40 py-8 overflow-hidden">
        <div className="marquee">
          <div className="marquee-track font-display text-5xl md:text-7xl">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center gap-16">
                art by KIYARI
                <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
          <div className="marquee-track font-display text-5xl md:text-7xl" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center gap-16">
                art by KIYARI
                <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-28 container-page grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">About the artist</div>
          <h2 className="font-display text-5xl md:text-6xl">A craft you can touch.</h2>
        </div>
        <div className="md:col-span-7 md:col-start-6 space-y-6 text-lg text-muted-foreground leading-relaxed">
          <p>
            Each one-of-a-kind creation starts with acrylic or oil — but the magic begins with
            whatever calls Kiyari's name in the craft aisle, fabric store, beauty supply, or
            home-building outlet.
          </p>
          <p className="text-foreground">
            You will never hear <em className="text-gold">"please don't touch"</em> at a Kiyari exhibition.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-6 text-sm">
            <Stat label="Originals" value="26+" />
            <Stat label="Exhibitions" value="12" />
            <Stat label="Years painting" value="9" />
          </div>
        </div>
      </section>

      {/* FEATURED ARTWORKS */}
      <section className="py-28 container-page">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">Available now</div>
            <h2 className="font-display text-5xl md:text-6xl">Featured works</h2>
          </div>
          <Link to="/artworks" className="hidden md:inline-flex items-center gap-2 text-sm link-underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          {featured.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.1 }}
              className={`group relative overflow-hidden ${i === 0 ? "md:row-span-2 md:col-span-2" : ""}`}
            >
              <Link to="/artworks" className="block">
                <div className={`relative overflow-hidden ${i === 0 ? "aspect-square md:aspect-[4/5]" : "aspect-square"}`}>
                  <img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />
                  <div className="absolute inset-x-0 bottom-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="font-display text-2xl md:text-3xl">{a.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-gold">
                      {a.price > 0 ? `$${a.price.toLocaleString()} CAD` : "Inquire"} · {a.collection}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="relative container-page text-center">
          <div className="text-xs uppercase tracking-[0.4em] text-gold mb-6">Join the network</div>
          <h2 className="font-display text-5xl md:text-7xl max-w-3xl mx-auto leading-tight">
            Be first to see what comes next.
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            New paintings, upcoming exhibitions, studio dispatches — straight to your inbox.
          </p>
          <Link to="/community" className="mt-10 inline-flex items-center gap-3 bg-gradient-gold px-8 py-4 text-sm uppercase tracking-[0.2em] text-primary-foreground font-medium hover:shadow-glow transition">
            Get in touch <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-4xl text-gold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
    </div>
  );
}
