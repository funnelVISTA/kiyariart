
-- Remove anonymous order insert. Orders are created server-side via the Stripe checkout
-- confirmation handler using the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
REVOKE INSERT ON public.orders FROM anon, authenticated;

-- Lock down storage.objects for admin-managed buckets.
CREATE POLICY "Admins manage artwork images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'artwork-images' AND private.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'artwork-images' AND private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage exhibition images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'exhibition-images' AND private.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'exhibition-images' AND private.has_role(auth.uid(), 'admin'));
