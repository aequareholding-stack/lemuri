-- LB-002: Grundgerüst nach docs/datenmodell.md
-- Erweiterungen, Hilfsfunktionen, Tabellen, Indizes, Trigger.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------
-- Eltern-Konto
-- ---------------------------------------------------------------
create table public.eltern_konto (
  id            uuid primary key references auth.users (id) on delete cascade,
  anzeige_name  text check (char_length(anzeige_name) <= 60),
  familiencode  text not null unique check (familiencode ~ '^[A-HJ-NP-Z2-9]{8}$'),
  erstellt_am   timestamptz not null default now(),
  geloescht_am  timestamptz
);

-- ---------------------------------------------------------------
-- Kind-Profil (nur Spitzname und Klassenstufe)
-- ---------------------------------------------------------------
create table public.kind_profil (
  id            uuid primary key default gen_random_uuid(),
  eltern_id     uuid not null references public.eltern_konto (id) on delete cascade,
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  spitzname     text not null check (char_length(spitzname) between 1 and 30),
  klassenstufe  smallint not null check (klassenstufe between 5 and 10),
  inaktiv_seit  timestamptz,          -- gesperrt, weil das Abo weniger Profile erlaubt; nie gelöscht
  erstellt_am   timestamptz not null default now()
);
create index kind_profil_eltern_idx on public.kind_profil (eltern_id);

-- PIN-Daten getrennt: diese Tabelle liest und schreibt nur der Server.
create table public.kind_pin (
  kind_id         uuid primary key references public.kind_profil (id) on delete cascade,
  pin_hash        text not null,
  fehlversuche    smallint not null default 0,
  gesperrt_am     timestamptz,
  aktualisiert_am timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Hilfsfunktionen für die Zugriffsregeln
-- ---------------------------------------------------------------

-- Ist der angemeldete Benutzer das Kind mit dieser Profil-ID?
create or replace function public.ist_kind(p_kind_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kind_profil
    where id = p_kind_id and auth_user_id = auth.uid()
  );
$$;

-- Ist der angemeldete Benutzer ein Elternteil dieses Kindes?
create or replace function public.ist_eltern_von(p_kind_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kind_profil
    where id = p_kind_id and eltern_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------
-- Themenkatalog (keine Kinderdaten)
-- ---------------------------------------------------------------
create table public.thema (
  id                uuid primary key default gen_random_uuid(),
  fach              text not null check (fach in ('mathe', 'deutsch', 'englisch')),
  name              text not null,
  klassenstufe_von  smallint not null check (klassenstufe_von between 5 and 10),
  klassenstufe_bis  smallint not null check (klassenstufe_bis between 5 and 10),
  reihenfolge       integer not null default 0,
  unique (fach, name)
);

-- ---------------------------------------------------------------
-- Aufgabe
-- ---------------------------------------------------------------
create table public.aufgabe (
  id            uuid primary key default gen_random_uuid(),
  kind_id       uuid not null references public.kind_profil (id) on delete cascade,
  fach          text not null check (fach in ('mathe', 'deutsch', 'englisch')),
  thema_id      uuid references public.thema (id) on delete set null,
  aufgabentext  text not null check (char_length(aufgabentext) <= 4000),
  eingabeart    text not null check (eingabeart in ('text', 'foto')),
  anliegen      text check (anliegen in ('anfang', 'mittendrin', 'pruefen')),
  erstellt_am   timestamptz not null default now(),
  erledigt_am   timestamptz
);
create index aufgabe_kind_idx on public.aufgabe (kind_id, erstellt_am desc);

-- ---------------------------------------------------------------
-- Gesprächsverlauf
-- ---------------------------------------------------------------
create table public.gespraech (
  id                uuid primary key default gen_random_uuid(),
  aufgabe_id        uuid not null references public.aufgabe (id) on delete cascade,
  kind_id           uuid not null references public.kind_profil (id) on delete cascade,
  status            text not null default 'laeuft' check (status in ('laeuft', 'abgeschlossen', 'abgebrochen')),
  hinweise_genutzt  smallint not null default 0 check (hinweise_genutzt between 0 and 3),
  gestartet_am      timestamptz not null default now(),
  beendet_am        timestamptz
);
create index gespraech_kind_idx on public.gespraech (kind_id, gestartet_am desc);

create table public.gespraech_nachricht (
  id            uuid primary key default gen_random_uuid(),
  gespraech_id  uuid not null references public.gespraech (id) on delete cascade,
  kind_id       uuid not null references public.kind_profil (id) on delete cascade,
  rolle         text not null check (rolle in ('kind', 'lemuri')),
  inhalt        text not null check (char_length(inhalt) <= 8000),
  erstellt_am   timestamptz not null default now()
);
create index gespraech_nachricht_gespraech_idx on public.gespraech_nachricht (gespraech_id, erstellt_am);

-- Hinweisstufe: eine Zeile je gegebenem Hinweis
create table public.hinweis (
  id            uuid primary key default gen_random_uuid(),
  gespraech_id  uuid not null references public.gespraech (id) on delete cascade,
  kind_id       uuid not null references public.kind_profil (id) on delete cascade,
  stufe         smallint not null check (stufe between 1 and 3),
  nachricht_id  uuid not null references public.gespraech_nachricht (id) on delete cascade,
  erstellt_am   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Prüfergebnis
-- ---------------------------------------------------------------
create table public.pruefergebnis (
  id                  uuid primary key default gen_random_uuid(),
  gespraech_id        uuid not null references public.gespraech (id) on delete cascade,
  kind_id             uuid not null references public.kind_profil (id) on delete cascade,
  thema_id            uuid references public.thema (id) on delete set null,
  pruefaufgabe_text   text not null,
  antwort_kind        text,
  richtig             boolean,
  sicherheit          text check (sicherheit in ('unsicher', 'geht_so', 'sicher')),
  erstellt_am         timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Thema mit Stand
-- ---------------------------------------------------------------
create table public.kind_thema_stand (
  kind_id                    uuid not null references public.kind_profil (id) on delete cascade,
  thema_id                   uuid not null references public.thema (id) on delete cascade,
  stand                      text not null default 'uebt_noch' check (stand in ('uebt_noch', 'verstanden')),
  anzahl_aufgaben            integer not null default 0,
  anzahl_pruefungen_richtig  integer not null default 0,
  aktualisiert_am            timestamptz not null default now(),
  primary key (kind_id, thema_id)
);

-- ---------------------------------------------------------------
-- Lernzeit
-- ---------------------------------------------------------------
create table public.lernsitzung (
  id            uuid primary key default gen_random_uuid(),
  kind_id       uuid not null references public.kind_profil (id) on delete cascade,
  gestartet_am  timestamptz not null default now(),
  beendet_am    timestamptz
);
create index lernsitzung_kind_idx on public.lernsitzung (kind_id, gestartet_am desc);

create table public.lernzeit_tag (
  kind_id   uuid not null references public.kind_profil (id) on delete cascade,
  datum     date not null,
  minuten   integer not null default 0 check (minuten >= 0),
  primary key (kind_id, datum)
);

-- ---------------------------------------------------------------
-- Elterneinstellungen
-- ---------------------------------------------------------------
create table public.elterneinstellungen (
  kind_id             uuid primary key references public.kind_profil (id) on delete cascade,
  tageslimit_minuten  integer not null default 60 check (tageslimit_minuten between 10 and 240),
  lernpause_ab        time not null default '20:30',
  lernpause_bis       time not null default '06:00',
  zeitzone            text not null default 'Europe/Berlin',
  aktualisiert_am     timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Abo (eine Zeile je Eltern-Konto)
-- ---------------------------------------------------------------
create table public.abo (
  id                 uuid primary key default gen_random_uuid(),
  eltern_id          uuid not null unique references public.eltern_konto (id) on delete cascade,
  plan               text not null default 'familie' check (plan in ('einzel', 'familie')),
  preis_cent         integer not null default 0 check (preis_cent in (0, 999, 1499)),
  status             text not null default 'testphase' check (status in ('testphase', 'aktiv', 'gekuendigt', 'abgelaufen')),
  anbieter           text check (anbieter in ('apple', 'google')),
  anbieter_referenz  text,
  testphase_bis      timestamptz not null,
  gueltig_bis        timestamptz not null,
  gekuendigt_am      timestamptz,
  erstellt_am        timestamptz not null default now()
);

-- Eine Testphase je Eltern-E-Mail: nur ein Hash der E-Mail, überlebt die Kontolöschung.
create table public.testphase_verbraucht (
  email_hash   text primary key,
  erstellt_am  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Kennzahlen für die Betreiber-Oberfläche: nur Zähler, keine Inhalte
-- ---------------------------------------------------------------
create view public.betreiber_kennzahlen
with (security_invoker = false)
as
  select
    (select count(*) from public.eltern_konto)                                  as eltern_konten,
    (select count(*) from public.kind_profil)                                   as kind_profile,
    (select count(*) from public.abo where status = 'aktiv')                    as abos_aktiv,
    (select count(*) from public.abo where status = 'testphase')                as abos_testphase,
    (select count(*) from public.gespraech where gestartet_am > now() - interval '7 days') as gespraeche_7_tage;
