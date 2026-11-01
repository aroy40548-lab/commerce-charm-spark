CREATE TABLE public.site_visits (
  visitor_id text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  user_id uuid,
  last_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visitor_id, day)
);
CREATE INDEX site_visits_day_idx ON public.site_visits(day);
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.visitor_stats()
RETURNS TABLE(period text, accounts bigint, guests bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.name,
    (SELECT count(DISTINCT user_id) FROM site_visits WHERE user_id IS NOT NULL AND last_at >= now() - p.span),
    (SELECT count(DISTINCT visitor_id) FROM site_visits WHERE user_id IS NULL AND last_at >= now() - p.span)
  FROM (VALUES ('24h', interval '24 hours', 1), ('7d', interval '7 days', 2), ('30d', interval '30 days', 3), ('90d', interval '90 days', 4), ('365d', interval '365 days', 5)) AS p(name, span, ord)
  ORDER BY p.ord
$$;
REVOKE ALL ON FUNCTION public.visitor_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_stats() TO service_role;