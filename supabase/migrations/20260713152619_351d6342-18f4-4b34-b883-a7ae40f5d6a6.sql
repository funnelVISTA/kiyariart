
-- Add sale fields to artworks_custom
ALTER TABLE public.artworks_custom
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_price numeric NULL;

-- Catalog overrides: lets admin set/override price and sale for the hardcoded catalog pieces
CREATE TABLE IF NOT EXISTS public.artwork_catalog_overrides (
  artwork_id text PRIMARY KEY,
  price_override numeric NULL,
  on_sale boolean NOT NULL DEFAULT false,
  sale_price numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artwork_catalog_overrides TO anon;
GRANT SELECT ON public.artwork_catalog_overrides TO authenticated;
GRANT ALL ON public.artwork_catalog_overrides TO service_role;

ALTER TABLE public.artwork_catalog_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read catalog overrides" ON public.artwork_catalog_overrides;
CREATE POLICY "Public can read catalog overrides"
  ON public.artwork_catalog_overrides FOR SELECT
  TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS update_artwork_catalog_overrides_updated_at ON public.artwork_catalog_overrides;
CREATE TRIGGER update_artwork_catalog_overrides_updated_at
  BEFORE UPDATE ON public.artwork_catalog_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
