
-- Multi-unit inventory tracking per artwork
CREATE TABLE IF NOT EXISTS public.artwork_stock (
  artwork_id text PRIMARY KEY,
  total_units integer NOT NULL DEFAULT 1 CHECK (total_units >= 0),
  sold_units integer NOT NULL DEFAULT 0 CHECK (sold_units >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_not_oversold CHECK (sold_units <= total_units)
);

GRANT SELECT ON public.artwork_stock TO anon, authenticated;
GRANT ALL ON public.artwork_stock TO service_role;

ALTER TABLE public.artwork_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock readable by anyone"
  ON public.artwork_stock FOR SELECT
  USING (true);

-- Atomic decrement, returns true if it succeeded.
CREATE OR REPLACE FUNCTION public.decrement_artwork_stock(_artwork_id text, _qty integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _qty <= 0 THEN RETURN false; END IF;

  INSERT INTO public.artwork_stock (artwork_id, total_units, sold_units)
  VALUES (_artwork_id, 1, 0)
  ON CONFLICT (artwork_id) DO NOTHING;

  UPDATE public.artwork_stock
  SET sold_units = sold_units + _qty, updated_at = now()
  WHERE artwork_id = _artwork_id
    AND sold_units + _qty <= total_units;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_artwork_stock(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_artwork_stock(text, integer) TO service_role;
