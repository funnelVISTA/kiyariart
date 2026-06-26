
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Auto-stamp shipped_at / delivered_at when status transitions.
CREATE OR REPLACE FUNCTION public.orders_stamp_status_dates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'shipped' AND (OLD.status IS DISTINCT FROM 'shipped') AND NEW.shipped_at IS NULL THEN
    NEW.shipped_at := now();
  END IF;
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_stamp_status_dates ON public.orders;
CREATE TRIGGER orders_stamp_status_dates
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_stamp_status_dates();
