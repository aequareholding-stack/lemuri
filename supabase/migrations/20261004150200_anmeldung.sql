-- LB-002: Anmeldung
-- Eltern per E-Mail (Supabase Auth). Beim ersten Anlegen entstehen Eltern-Konto,
-- Familiencode und Abo in der Testphase.
-- Kind: eigener Auth-Benutzer (rolle = 'kind' in den Metadaten), Anmeldung mit
-- Familiencode + 4-stelliger PIN über die Edge Function "kind-anmelden", die die
-- Funktionen hier als service_role aufruft. Sperre nach fünf Fehlversuchen.

-- ---------------------------------------------------------------
-- Familiencode ohne verwechselbare Zeichen (kein 0, O, 1, I)
-- ---------------------------------------------------------------
create or replace function public.familiencode_erzeugen()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  bytes bytea;
  i int;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.eltern_konto where familiencode = code);
  end loop;
  return code;
end $$;

-- ---------------------------------------------------------------
-- Neuer Auth-Benutzer: Eltern bekommen Konto + Abo, Kinder nicht
-- ---------------------------------------------------------------
create or replace function public.neuer_auth_benutzer()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_schon_verbraucht boolean;
begin
  if coalesce(new.raw_user_meta_data ->> 'rolle', 'eltern') = 'kind' then
    return new;  -- Kind-Profil legt die Edge Function über kind_profil_anlegen an
  end if;

  insert into public.eltern_konto (id, anzeige_name, familiencode)
  values (new.id, new.raw_user_meta_data ->> 'anzeige_name', public.familiencode_erzeugen());

  -- Eine Testphase je Eltern-E-Mail (nur ein Hash wird gemerkt)
  v_hash := encode(extensions.digest(lower(trim(new.email)), 'sha256'), 'hex');
  v_schon_verbraucht := exists (select 1 from public.testphase_verbraucht where email_hash = v_hash);
  insert into public.testphase_verbraucht (email_hash) values (v_hash) on conflict do nothing;

  if v_schon_verbraucht then
    insert into public.abo (eltern_id, plan, status, testphase_bis, gueltig_bis)
    values (new.id, 'familie', 'abgelaufen', now(), now());
  else
    insert into public.abo (eltern_id, plan, status, testphase_bis, gueltig_bis)
    values (new.id, 'familie', 'testphase', now() + interval '30 days', now() + interval '30 days');
  end if;

  return new;
end $$;

drop trigger if exists neuer_auth_benutzer on auth.users;
create trigger neuer_auth_benutzer
  after insert on auth.users
  for each row execute function public.neuer_auth_benutzer();

-- ---------------------------------------------------------------
-- Wie viele Profile erlaubt das Abo?
-- ---------------------------------------------------------------
create or replace function public.profil_grenze(p_eltern_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a.status in ('testphase', 'aktiv', 'gekuendigt') and a.plan = 'familie' then 3
    when a.status in ('testphase', 'aktiv', 'gekuendigt') and a.plan = 'einzel'  then 1
    else 0
  end
  from public.abo a where a.eltern_id = p_eltern_id;
$$;

-- ---------------------------------------------------------------
-- Kind-Profil anlegen (nur Server, nach dem Anlegen des Auth-Benutzers)
-- ---------------------------------------------------------------
create or replace function public.kind_profil_anlegen(
  p_eltern_id uuid,
  p_auth_user_id uuid,
  p_spitzname text,
  p_klassenstufe smallint,
  p_pin text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kind_id uuid;
  v_aktive integer;
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN muss aus genau vier Ziffern bestehen' using errcode = '22023';
  end if;

  select count(*) into v_aktive
  from public.kind_profil where eltern_id = p_eltern_id and inaktiv_seit is null;

  if v_aktive >= public.profil_grenze(p_eltern_id) then
    raise exception 'Das Abo erlaubt kein weiteres aktives Profil' using errcode = 'P0001';
  end if;

  insert into public.kind_profil (eltern_id, auth_user_id, spitzname, klassenstufe)
  values (p_eltern_id, p_auth_user_id, trim(p_spitzname), p_klassenstufe)
  returning id into v_kind_id;

  insert into public.kind_pin (kind_id, pin_hash)
  values (v_kind_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));

  insert into public.elterneinstellungen (kind_id) values (v_kind_id);

  return v_kind_id;
end $$;

-- ---------------------------------------------------------------
-- Profile einer Familie für die Auswahl vor der PIN-Eingabe (nur Server)
-- ---------------------------------------------------------------
create or replace function public.familie_profile(p_familiencode text)
returns table (kind_id uuid, spitzname text, gesperrt boolean)
language sql
stable
security definer
set search_path = public
as $$
  select k.id, k.spitzname, (p.gesperrt_am is not null or k.inaktiv_seit is not null)
  from public.eltern_konto e
  join public.kind_profil k on k.eltern_id = e.id
  join public.kind_pin p on p.kind_id = k.id
  where e.familiencode = upper(trim(p_familiencode))
  order by k.erstellt_am;
$$;

-- ---------------------------------------------------------------
-- PIN prüfen (nur Server). Ergebnis: ok, falsch, gesperrt, unbekannt
-- Nach fünf Fehlversuchen bleibt das Profil gesperrt, bis die Eltern
-- eine neue PIN setzen.
-- ---------------------------------------------------------------
create or replace function public.kind_anmeldung_pruefen(
  p_familiencode text,
  p_kind_id uuid,
  p_pin text
)
returns table (ergebnis text, auth_user_id uuid, verbleibende_versuche integer)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_kind public.kind_profil%rowtype;
  v_pin public.kind_pin%rowtype;
  max_versuche constant integer := 5;
begin
  select k.* into v_kind
  from public.kind_profil k
  join public.eltern_konto e on e.id = k.eltern_id
  where k.id = p_kind_id and e.familiencode = upper(trim(p_familiencode));

  if not found then
    return query select 'unbekannt'::text, null::uuid, 0;
    return;
  end if;

  select p.* into v_pin from public.kind_pin p where p.kind_id = v_kind.id for update;

  if v_pin.gesperrt_am is not null or v_kind.inaktiv_seit is not null then
    return query select 'gesperrt'::text, null::uuid, 0;
    return;
  end if;

  if p_pin ~ '^[0-9]{4}$' and v_pin.pin_hash = extensions.crypt(p_pin, v_pin.pin_hash) then
    update public.kind_pin set fehlversuche = 0, aktualisiert_am = now() where kind_id = v_kind.id;
    return query select 'ok'::text, v_kind.auth_user_id, max_versuche;
    return;
  end if;

  update public.kind_pin
  set fehlversuche = fehlversuche + 1,
      gesperrt_am = case when fehlversuche + 1 >= max_versuche then now() else null end,
      aktualisiert_am = now()
  where kind_id = v_kind.id
  returning * into v_pin;

  if v_pin.gesperrt_am is not null then
    return query select 'gesperrt'::text, null::uuid, 0;
  else
    return query select 'falsch'::text, null::uuid, max_versuche - v_pin.fehlversuche;
  end if;
end $$;

-- ---------------------------------------------------------------
-- Neue PIN setzen (nur Server, im Auftrag der Eltern): hebt die Sperre auf
-- ---------------------------------------------------------------
create or replace function public.kind_pin_setzen(p_eltern_id uuid, p_kind_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN muss aus genau vier Ziffern bestehen' using errcode = '22023';
  end if;
  if not exists (select 1 from public.kind_profil where id = p_kind_id and eltern_id = p_eltern_id) then
    raise exception 'Kein Profil dieser Eltern' using errcode = 'P0002';
  end if;
  update public.kind_pin
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      fehlversuche = 0,
      gesperrt_am = null,
      aktualisiert_am = now()
  where kind_id = p_kind_id;
end $$;

-- ---------------------------------------------------------------
-- Löschen von Profil und Konto läuft über die Edge Functions
-- "kind-profil-loeschen" und "konto-loeschen": Sie entfernen die Anmelde-
-- Benutzer über die Auth-Verwaltung, die Fremdschlüssel räumen den Rest weg.
-- Eltern löschen deshalb nicht direkt in kind_profil.
-- ---------------------------------------------------------------
revoke delete on public.kind_profil from authenticated;

-- Nur diese Funktionen dürfen von der App aufgerufen werden.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.ist_kind(uuid), public.ist_eltern_von(uuid) to authenticated;
grant execute on all functions in schema public to service_role;
