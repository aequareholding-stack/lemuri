-- LB-002: Zeitgesteuerte Löschung nach docs/datenmodell.md, Abschnitt 5
-- Gespräche und Aufgaben: 90 Tage. Lernsitzungen: 7 Tage. Lernzeit_tag: 12 Monate.
-- E-Mail-Prüfsumme gegen eine zweite Testphase: 24 Monate.
-- Keine automatische Löschung von Konten oder Profilen.

create or replace function public.loeschlauf()
returns table (tabelle text, geloescht bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  -- Gespräche samt Nachrichten, Hinweisen und Prüfergebnissen (Fremdschlüssel löschen mit)
  delete from public.gespraech
  where coalesce(beendet_am, gestartet_am) < now() - interval '90 days';
  get diagnostics n = row_count;
  tabelle := 'gespraech'; geloescht := n; return next;

  -- Aufgaben ohne laufendes Gespräch
  delete from public.aufgabe a
  where coalesce(a.erledigt_am, a.erstellt_am) < now() - interval '90 days'
    and not exists (select 1 from public.gespraech g where g.aufgabe_id = a.id);
  get diagnostics n = row_count;
  tabelle := 'aufgabe'; geloescht := n; return next;

  -- Lernsitzungen erst in Tagessummen übernehmen, dann löschen
  insert into public.lernzeit_tag (kind_id, datum, minuten)
  select s.kind_id,
         (s.gestartet_am at time zone coalesce(e.zeitzone, 'Europe/Berlin'))::date,
         greatest(1, round(extract(epoch from (s.beendet_am - s.gestartet_am)) / 60))::int
  from public.lernsitzung s
  left join public.elterneinstellungen e on e.kind_id = s.kind_id
  where s.beendet_am is not null and s.beendet_am < now() - interval '7 days'
  on conflict (kind_id, datum) do update set minuten = public.lernzeit_tag.minuten + excluded.minuten;

  delete from public.lernsitzung
  where beendet_am is not null and beendet_am < now() - interval '7 days';
  get diagnostics n = row_count;
  tabelle := 'lernsitzung'; geloescht := n; return next;

  delete from public.lernzeit_tag where datum < current_date - interval '12 months';
  get diagnostics n = row_count;
  tabelle := 'lernzeit_tag'; geloescht := n; return next;

  -- Prüfsumme der Eltern-E-Mail gegen eine zweite Testphase: nach 24 Monaten löschen
  delete from public.testphase_verbraucht where erstellt_am < now() - interval '24 months';
  get diagnostics n = row_count;
  tabelle := 'testphase_verbraucht'; geloescht := n; return next;
end $$;

revoke execute on function public.loeschlauf() from public, anon, authenticated;
grant execute on function public.loeschlauf() to service_role;

-- Täglich um 03:10 Uhr UTC, wenn pg_cron im Projekt eingeschaltet ist
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('lemuri-loeschlauf', '10 3 * * *', 'select public.loeschlauf()');
  end if;
end $$;
