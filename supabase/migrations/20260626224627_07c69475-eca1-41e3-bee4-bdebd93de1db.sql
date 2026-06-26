
-- 1) Lock down has_role: revoke broad EXECUTE, grant only to needed roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2) Replace always-true INSERT policies with validating checks
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(btrim(customer_name)) BETWEEN 1 AND 200
    AND length(customer_email) BETWEEN 3 AND 320
    AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (customer_phone IS NULL OR length(customer_phone) <= 50)
    AND (shipping_address IS NULL OR length(shipping_address) <= 2000)
    AND (notes IS NULL OR length(notes) <= 2000)
    AND total_cad >= 0
    AND jsonb_typeof(items) = 'array'
  );

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe"
  ON public.subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(email) BETWEEN 3 AND 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (name IS NULL OR length(name) <= 200)
    AND (source IS NULL OR length(source) <= 100)
  );
