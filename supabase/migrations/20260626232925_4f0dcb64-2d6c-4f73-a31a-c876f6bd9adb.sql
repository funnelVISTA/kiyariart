ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_intent_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_total_cad numeric;
ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;