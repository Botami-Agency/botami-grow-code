ALTER FUNCTION public.move_to_dlq(text,text,bigint,jsonb) SET search_path = '';
ALTER FUNCTION public.read_email_batch(text,integer,integer) SET search_path = '';
ALTER FUNCTION public.enqueue_email(text,jsonb) SET search_path = '';
ALTER FUNCTION public.delete_email(text,bigint) SET search_path = '';

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can submit valid leads" ON public.leads
FOR INSERT TO anon, authenticated
WITH CHECK (
  length(btrim(first_name)) BETWEEN 1 AND 200
  AND length(email) <= 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (message IS NULL OR length(message) <= 20000)
  AND (cdc_markdown IS NULL OR length(cdc_markdown) <= 200000)
  AND notes IS NULL
  AND prochaine_action IS NULL
  AND updated_by IS NULL
);