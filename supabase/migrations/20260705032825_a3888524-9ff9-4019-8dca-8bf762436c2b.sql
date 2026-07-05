CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'artwork',
  entity_id TEXT,
  entity_title TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_activity_log TO authenticated;
GRANT ALL ON public.admin_activity_log TO service_role;

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activity log"
ON public.admin_activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  )
);

CREATE INDEX admin_activity_log_created_at_idx
  ON public.admin_activity_log (created_at DESC);
CREATE INDEX admin_activity_log_entity_idx
  ON public.admin_activity_log (entity_type, entity_id);
