CREATE TABLE public.sold_artworks (
  artwork_id text PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  sold_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sold_artworks TO anon, authenticated;
GRANT ALL ON public.sold_artworks TO service_role;

ALTER TABLE public.sold_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view sold artworks"
  ON public.sold_artworks FOR SELECT
  USING (true);

CREATE POLICY "Admins manage sold artworks"
  ON public.sold_artworks FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));