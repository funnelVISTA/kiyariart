
CREATE TABLE public.artworks_custom (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  collection TEXT NOT NULL DEFAULT 'Our Essence',
  medium TEXT,
  sold BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artworks_custom TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artworks_custom TO authenticated;
GRANT ALL ON public.artworks_custom TO service_role;
ALTER TABLE public.artworks_custom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view artworks" ON public.artworks_custom FOR SELECT USING (true);
CREATE POLICY "Admins can insert artworks" ON public.artworks_custom FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update artworks" ON public.artworks_custom FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete artworks" ON public.artworks_custom FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER artworks_custom_updated BEFORE UPDATE ON public.artworks_custom
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exhibitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT,
  city TEXT,
  blurb TEXT,
  event_date DATE,
  end_date DATE,
  time_text TEXT,
  image_url TEXT,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exhibitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exhibitions TO authenticated;
GRANT ALL ON public.exhibitions TO service_role;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exhibitions" ON public.exhibitions FOR SELECT USING (true);
CREATE POLICY "Admins can insert exhibitions" ON public.exhibitions FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update exhibitions" ON public.exhibitions FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete exhibitions" ON public.exhibitions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER exhibitions_updated BEFORE UPDATE ON public.exhibitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
