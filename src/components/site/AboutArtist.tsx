import aboutPhoto1 from "@/assets/about-photo-1.png.asset.json";
import aboutPhoto2 from "@/assets/about-photo-2.png.asset.json";

export function AboutArtistSection() {
  return (
    <section className="py-28 bg-background">
      <div className="mx-auto px-6 max-w-[1140px]">
        <div className="text-xs uppercase tracking-[0.3em] text-gold mb-4">
          About the Artist
        </div>
        <h2 className="font-display text-5xl md:text-6xl leading-[1.05]">
          The story in the <em className="italic text-gradient-gold not-italic-fallback" style={{ fontStyle: "italic" }}>texture</em>
        </h2>
        <div className="mt-6 h-[2px] w-[52px] bg-gold" />

        <div className="mt-10 text-muted-foreground text-lg leading-relaxed about-wrap">
          {/* Photo 1 — right, tilted CW (desktop only) */}
          <figure className="about-photo about-photo-right">
            <div className="about-photo-frame">
              <img
                src={aboutPhoto1.url}
                alt="Kiyari, in the studio"
                loading="lazy"
                className="block w-full h-full object-cover"
              />
            </div>
            <figcaption className="mt-2 italic font-serif text-sm text-muted-foreground text-center">
              Kiyari, in the studio
            </figcaption>
          </figure>

          <p className="font-display text-2xl md:text-3xl leading-snug text-foreground mb-6">
            Kiyari discovered painting in adulthood, at a time when she needed space to breathe.
          </p>

          <p className="mb-6">
            What began as a therapeutic outlet soon became a deeply personal form of healing. She blends traditional art mediums with whatever calls to her spirit — found in the craft aisle, fabric store, beauty supply, and beyond — transforming them into richly textured artworks.
          </p>

          {/* Photo 2 — left, tilted CCW (desktop only) */}
          <figure className="about-photo about-photo-left">
            <div className="about-photo-frame">
              <img
                src={aboutPhoto2.url}
                alt="Layered acrylic & mixed media"
                loading="lazy"
                className="block w-full h-full object-cover"
              />
            </div>
            <figcaption className="mt-2 italic font-serif text-sm text-muted-foreground text-center">
              Layered acrylic & mixed media
            </figcaption>
          </figure>

          <p className="mb-6">
            Her process is intuitive and fearless, with a refusal to colour inside the lines. Kiyari's artworks welcome you closer. You are encouraged to run your fingers across the textures, to experience the emotion, and{" "}
            <span className="italic font-semibold text-gradient-gold">feel</span> the story.
          </p>

          <p className="mb-8">
            Each piece carries its own weight and rhythm — a conversation between the hand that made it and the eye that meets it.
          </p>

          <p className="italic font-display text-2xl md:text-3xl text-gradient-gold clear-both">
            You will never hear "don't touch" with a Kiyari creation.
          </p>
        </div>
      </div>
    </section>
  );
}