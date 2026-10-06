-- LB-002: Rechte härten.
-- Supabase gibt neuen Tabellen und Funktionen in "public" automatisch Rechte für
-- anon und authenticated. RLS hält die Daten trotzdem zurück, aber die Regel aus
-- docs/datenmodell.md ist strenger: nicht angemeldet = gar nichts, PIN-Daten nur Server.

-- Nicht angemeldete Benutzer: keine Rechte auf Tabellen, Sichten und Funktionen
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Angemeldete Benutzer: nur die Rechte aus der Migration "zugriffsregeln"
revoke all on public.kind_pin from authenticated;
revoke all on public.testphase_verbraucht from authenticated;
revoke all on public.betreiber_kennzahlen from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.thema, public.hinweis,
  public.kind_thema_stand, public.lernzeit_tag, public.abo from authenticated;
revoke delete, truncate, references, trigger on public.eltern_konto, public.aufgabe, public.gespraech,
  public.gespraech_nachricht, public.pruefergebnis, public.lernsitzung, public.elterneinstellungen from authenticated;
revoke truncate, references, trigger on public.kind_profil from authenticated;

-- Künftige Tabellen und Funktionen bekommen diese Standardrechte nicht mehr
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated;

-- Die Hilfsfunktionen der Zugriffsregeln brauchen keine erhöhten Rechte:
-- Sie prüfen nur Zeilen von kind_profil, die der Aufrufer ohnehin sehen darf.
alter function public.ist_kind(uuid) security invoker;
alter function public.ist_eltern_von(uuid) security invoker;

-- Profile legt und löscht nur der Server (Edge Functions kind-profil-anlegen, kind-profil-loeschen)
revoke insert, delete on public.kind_profil from authenticated;
