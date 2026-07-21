ALTER TABLE public.artworks_custom
  ADD COLUMN IF NOT EXISTS shipping_cad numeric NOT NULL DEFAULT 0;

ALTER TABLE public.artwork_catalog_overrides
  ADD COLUMN IF NOT EXISTS shipping_cad numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;