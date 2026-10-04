-- LB-002: Zugriffsregeln (Row Level Security) nach docs/datenmodell.md, Abschnitt 6
--
-- Grundsatz: Jede Tabelle hat RLS. Ohne passende Regel ist nichts lesbar.
-- Gesprächsinhalte (aufgabe, gespraech, gespraech_nachricht, hinweis, pruefergebnis)
-- haben nur Regeln für das Kind. Eltern und Betreiber-Oberfläche bekommen keine Regel.
-- PIN-Daten (kind_pin) haben gar keine Regel: nur der Server (service_role) liest sie.

-- ---------------------------------------------------------------
-- Rechte auf Schema und Tabellen
-- ---------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- Angemeldete Benutzer: Rechte nur dort, wo eine Regel sie weiter einschränkt.
grant select, update                  on public.eltern_konto          to authenticated;
grant select, update, delete          on public.kind_profil           to authenticated;
grant select                          on public.thema                 to authenticated;
grant select, insert, update          on public.aufgabe               to authenticated;
grant select, insert                  on public.gespraech             to authenticated;
grant select, insert                  on public.gespraech_nachricht   to authenticated;
grant select                          on public.hinweis               to authenticated;
grant select, insert, update          on public.pruefergebnis         to authenticated;
grant select                          on public.kind_thema_stand      to authenticated;
grant select, insert, update          on public.lernsitzung           to authenticated;
grant select                          on public.lernzeit_tag          to authenticated;
grant select, insert, update          on public.elterneinstellungen   to authenticated;
grant select                          on public.abo                   to authenticated;
-- kind_pin und testphase_verbraucht: keine Rechte für authenticated oder anon.

-- Server (Edge Functions, Webhooks, Löschlauf)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Betreiber-Oberfläche: eigene Rolle, sieht nur Themenkatalog und Zähler.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'betreiber') then
    create role betreiber nologin;
  end if;
end $$;
grant usage on schema public to betreiber;
grant select on public.thema to betreiber;
grant select on public.betreiber_kennzahlen to betreiber;

-- ---------------------------------------------------------------
-- RLS einschalten (auch für den Tabelleneigentümer erzwingen)
-- ---------------------------------------------------------------
alter table public.eltern_konto          enable row level security;
alter table public.kind_profil           enable row level security;
alter table public.kind_pin              enable row level security;
alter table public.thema                 enable row level security;
alter table public.aufgabe               enable row level security;
alter table public.gespraech             enable row level security;
alter table public.gespraech_nachricht   enable row level security;
alter table public.hinweis               enable row level security;
alter table public.pruefergebnis         enable row level security;
alter table public.kind_thema_stand      enable row level security;
alter table public.lernsitzung           enable row level security;
alter table public.lernzeit_tag          enable row level security;
alter table public.elterneinstellungen   enable row level security;
alter table public.abo                   enable row level security;
alter table public.testphase_verbraucht  enable row level security;

-- ---------------------------------------------------------------
-- eltern_konto: Eltern lesen und ändern die eigene Zeile
-- ---------------------------------------------------------------
create policy "eltern lesen eigenes konto"
  on public.eltern_konto for select to authenticated
  using (id = auth.uid());

create policy "eltern aendern eigenes konto"
  on public.eltern_konto for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------
-- kind_profil: Eltern verwalten eigene Kinder, Kind liest sich selbst
-- (Anlegen nur über den Server, weil dafür ein Anmelde-Benutzer nötig ist)
-- ---------------------------------------------------------------
create policy "eltern lesen eigene kinder"
  on public.kind_profil for select to authenticated
  using (eltern_id = auth.uid());

create policy "eltern aendern eigene kinder"
  on public.kind_profil for update to authenticated
  using (eltern_id = auth.uid())
  with check (eltern_id = auth.uid());

create policy "eltern loeschen eigene kinder"
  on public.kind_profil for delete to authenticated
  using (eltern_id = auth.uid());

create policy "kind liest eigenes profil"
  on public.kind_profil for select to authenticated
  using (auth_user_id = auth.uid());

-- kind_pin: bewusst keine Regel. Nur service_role (umgeht RLS) kommt heran.

-- ---------------------------------------------------------------
-- thema: alle Angemeldeten lesen
-- ---------------------------------------------------------------
create policy "angemeldete lesen themen"
  on public.thema for select to authenticated
  using (true);

-- ---------------------------------------------------------------
-- aufgabe: nur das Kind
-- ---------------------------------------------------------------
create policy "kind liest eigene aufgaben"
  on public.aufgabe for select to authenticated
  using (public.ist_kind(kind_id));

create policy "kind legt eigene aufgaben an"
  on public.aufgabe for insert to authenticated
  with check (public.ist_kind(kind_id));

create policy "kind aendert eigene aufgaben"
  on public.aufgabe for update to authenticated
  using (public.ist_kind(kind_id))
  with check (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- gespraech: nur das Kind
-- ---------------------------------------------------------------
create policy "kind liest eigene gespraeche"
  on public.gespraech for select to authenticated
  using (public.ist_kind(kind_id));

create policy "kind legt eigene gespraeche an"
  on public.gespraech for insert to authenticated
  with check (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- gespraech_nachricht: nur das Kind; Lemuri-Antworten schreibt der Server
-- ---------------------------------------------------------------
create policy "kind liest eigene nachrichten"
  on public.gespraech_nachricht for select to authenticated
  using (public.ist_kind(kind_id));

create policy "kind schreibt eigene nachrichten"
  on public.gespraech_nachricht for insert to authenticated
  with check (public.ist_kind(kind_id) and rolle = 'kind');

-- ---------------------------------------------------------------
-- hinweis: Kind liest, Server schreibt
-- ---------------------------------------------------------------
create policy "kind liest eigene hinweise"
  on public.hinweis for select to authenticated
  using (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- pruefergebnis: Kind liest und antwortet; "richtig" setzt der Server
-- ---------------------------------------------------------------
create policy "kind liest eigene pruefergebnisse"
  on public.pruefergebnis for select to authenticated
  using (public.ist_kind(kind_id));

create policy "kind legt eigene pruefergebnisse an"
  on public.pruefergebnis for insert to authenticated
  with check (public.ist_kind(kind_id) and richtig is null);

create policy "kind traegt eigene antwort ein"
  on public.pruefergebnis for update to authenticated
  using (public.ist_kind(kind_id))
  with check (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- kind_thema_stand: Kind und Eltern lesen, Server schreibt
-- ---------------------------------------------------------------
create policy "kind liest eigenen themenstand"
  on public.kind_thema_stand for select to authenticated
  using (public.ist_kind(kind_id));

create policy "eltern lesen themenstand ihrer kinder"
  on public.kind_thema_stand for select to authenticated
  using (public.ist_eltern_von(kind_id));

-- ---------------------------------------------------------------
-- lernsitzung: Kind legt an und beendet, liest nur den heutigen Tag
-- ---------------------------------------------------------------
create policy "kind liest eigene sitzungen von heute"
  on public.lernsitzung for select to authenticated
  using (public.ist_kind(kind_id) and gestartet_am > now() - interval '36 hours');

create policy "kind legt eigene sitzung an"
  on public.lernsitzung for insert to authenticated
  with check (public.ist_kind(kind_id));

create policy "kind beendet eigene sitzung"
  on public.lernsitzung for update to authenticated
  using (public.ist_kind(kind_id))
  with check (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- lernzeit_tag: Kind und Eltern lesen, Server schreibt
-- ---------------------------------------------------------------
create policy "kind liest eigene lernzeit"
  on public.lernzeit_tag for select to authenticated
  using (public.ist_kind(kind_id));

create policy "eltern lesen lernzeit ihrer kinder"
  on public.lernzeit_tag for select to authenticated
  using (public.ist_eltern_von(kind_id));

-- ---------------------------------------------------------------
-- elterneinstellungen: Eltern lesen und ändern, Kind liest
-- ---------------------------------------------------------------
create policy "eltern lesen einstellungen ihrer kinder"
  on public.elterneinstellungen for select to authenticated
  using (public.ist_eltern_von(kind_id));

create policy "eltern legen einstellungen an"
  on public.elterneinstellungen for insert to authenticated
  with check (public.ist_eltern_von(kind_id));

create policy "eltern aendern einstellungen"
  on public.elterneinstellungen for update to authenticated
  using (public.ist_eltern_von(kind_id))
  with check (public.ist_eltern_von(kind_id));

create policy "kind liest eigene einstellungen"
  on public.elterneinstellungen for select to authenticated
  using (public.ist_kind(kind_id));

-- ---------------------------------------------------------------
-- abo: Eltern lesen das eigene, Server schreibt
-- ---------------------------------------------------------------
create policy "eltern lesen eigenes abo"
  on public.abo for select to authenticated
  using (eltern_id = auth.uid());

-- testphase_verbraucht: keine Regel, nur Server.

-- ---------------------------------------------------------------
-- Sichten für die Eltern-App: genau die erlaubten Felder
-- ---------------------------------------------------------------
create view public.eltern_lernzeit_woche
with (security_invoker = true)
as
  select l.kind_id, l.datum, l.minuten
  from public.lernzeit_tag l
  join public.kind_profil k on k.id = l.kind_id
  where k.eltern_id = auth.uid()
    and l.datum >= current_date - 6;

create view public.eltern_themen
with (security_invoker = true)
as
  select s.kind_id, t.name as thema_name, t.fach, s.stand, s.aktualisiert_am
  from public.kind_thema_stand s
  join public.thema t on t.id = s.thema_id
  join public.kind_profil k on k.id = s.kind_id
  where k.eltern_id = auth.uid();

grant select on public.eltern_lernzeit_woche, public.eltern_themen to authenticated;
