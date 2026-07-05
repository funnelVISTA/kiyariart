
-- 1) Lock down SECURITY DEFINER helpers in public schema: revoke EXECUTE from anon/authenticated.
--    These functions are only invoked by triggers, cron, or server-side code with elevated roles.
REVOKE EXECUTE ON FUNCTION public.decrement_artwork_stock(text, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch()                  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake()                      FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;

-- 2) Orders: all writes go through server functions using service_role. Add a
--    defense-in-depth SELECT policy so a signed-in customer can only read
--    their own orders (matched by verified auth email). No INSERT policy is
--    added because checkout persists via service_role only.
CREATE POLICY "Customers can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  customer_email IS NOT NULL
  AND lower(customer_email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
);

-- 3) sold_artworks: remove public read access that exposed internal order_id.
--    All reads happen server-side via service_role (payments/admin server fns),
--    which bypasses RLS, so removing the public policy has no app impact.
DROP POLICY IF EXISTS "Public can view sold artworks" ON public.sold_artworks;
REVOKE SELECT ON public.sold_artworks FROM anon, authenticated, public;
