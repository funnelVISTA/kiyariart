
-- Add display_order, SEO + alt fields to artworks_custom
ALTER TABLE public.artworks_custom
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS alt_text TEXT;

CREATE INDEX IF NOT EXISTS idx_artworks_custom_display_order
  ON public.artworks_custom (display_order);

-- Table to override display order for static catalog items
CREATE TABLE IF NOT EXISTS public.artwork_display_order (
  artwork_id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artwork_display_order TO anon, authenticated;
GRANT ALL ON public.artwork_display_order TO service_role;

ALTER TABLE public.artwork_display_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read artwork display order"
  ON public.artwork_display_order FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage artwork display order"
  ON public.artwork_display_order FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
