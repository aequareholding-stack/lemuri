// Edge Function "kind-anmelden": Anmeldung des Kindes mit Familiencode und PIN.
// Ohne Anmeldung aufrufbar (nur mit dem öffentlichen Schlüssel der App).
//
// Schritt 1: { "aktion": "profile", "familiencode": "ABCD2345" }
//   -> Liste der Profile dieser Familie (Spitzname, gesperrt), zur Auswahl.
// Schritt 2: { "aktion": "anmelden", "familiencode": "...", "kind_id": "...", "pin": "1234" }
//   -> Sitzung des Kind-Benutzers oder Fehler (falsch / gesperrt / unbekannt).
//
// Die PIN-Prüfung und die Sperre nach fünf Fehlversuchen liegen in der Datenbank
// (kind_anmeldung_pruefen), die nur der Server aufrufen darf.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { antwort, corsKopf, istPin, kindEmail, kindPasswort, serverClient, umgebung } from '../_shared/lemuri.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKopf });
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST' });

  let body: { aktion?: string; familiencode?: string; kind_id?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return antwort(400, { fehler: 'Ungültige Anfrage' });
  }

  const familiencode = (body.familiencode ?? '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(familiencode)) {
    return antwort(400, { fehler: 'Der Familiencode hat acht Zeichen.' });
  }

  const server = serverClient();

  if (body.aktion === 'profile') {
    const { data, error } = await server.rpc('familie_profile', { p_familiencode: familiencode });
    if (error) return antwort(500, { fehler: 'Profile konnten nicht geladen werden' });
    // Bewusst keine Unterscheidung zwischen "Code unbekannt" und "keine Profile",
    // damit sich Familiencodes nicht durchprobieren lassen.
    return antwort(200, { profile: data ?? [] });
  }

  if (body.aktion === 'anmelden') {
    if (!body.kind_id || !istPin(body.pin)) {
      return antwort(400, { fehler: 'Profil und vierstellige PIN nötig' });
    }
    const { data, error } = await server.rpc('kind_anmeldung_pruefen', {
      p_familiencode: familiencode,
      p_kind_id: body.kind_id,
      p_pin: body.pin,
    });
    if (error || !data?.[0]) return antwort(500, { fehler: 'Prüfung fehlgeschlagen' });

    const ergebnis = data[0] as { ergebnis: string; auth_user_id: string | null; verbleibende_versuche: number };
    if (ergebnis.ergebnis !== 'ok' || !ergebnis.auth_user_id) {
      return antwort(401, { ergebnis: ergebnis.ergebnis, verbleibende_versuche: ergebnis.verbleibende_versuche });
    }

    // Sitzung des Kind-Benutzers ausstellen
    const anon = createClient(umgebung('SUPABASE_URL'), umgebung('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const sitzung = await anon.auth.signInWithPassword({
      email: kindEmail(ergebnis.auth_user_id),
      password: await kindPasswort(ergebnis.auth_user_id),
    });
    if (sitzung.error || !sitzung.data.session) {
      return antwort(500, { fehler: 'Sitzung konnte nicht erstellt werden' });
    }
    return antwort(200, {
      ergebnis: 'ok',
      access_token: sitzung.data.session.access_token,
      refresh_token: sitzung.data.session.refresh_token,
    });
  }

  return antwort(400, { fehler: 'Unbekannte Aktion' });
});
