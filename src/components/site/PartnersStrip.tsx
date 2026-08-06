import fsf from "@/assets/futurestarsfoundation.webp.asset.json";
import bigRich from "@/assets/Big_Rich.jpg.asset.json";
import fiveStar from "@/assets/fivestar.jpeg.asset.json";
import amEnough from "@/assets/amenough_logo.png.asset.json";
import thrive from "@/assets/Thrive4Black.png.asset.json";

const PARTNERS = [
  { name: "Future Stars Foundation", url: "https://futurestarsfoundation.com/", src: fsf.url },
  { name: "Big Rich Entertainment", url: "https://bigrichentertainment.ca/", src: bigRich.url },
  { name: "FiveStarKidd Productions", url: "https://ca.linkedin.com/in/keith-best-0a77852b", src: fiveStar.url },
  { name: "Am Enough Society", url: "https://amenoughsociety.org/", src: amEnough.url },
  { name: "Thrive 4 Black", url: "https://thrive4blacks.org/", src: thrive.url },
];

export function PartnersStrip() {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {PARTNERS.map((p) => (
        <div key={p.name} className="w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-1rem)] md:w-40 lg:w-44">
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={p.name}
            className="group grid h-24 w-full place-items-center rounded-xl border border-border bg-cream/95 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-gold hover:shadow-elegant md:h-28"
          >
            <img
              src={p.src}
              alt={p.name}
              loading="lazy"
              className="max-h-12 w-auto max-w-full object-contain md:max-h-14"
            />
          </a>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-gold"
          >
            {p.name}
          </a>
        </div>
      ))}
    </div>
  );
}
