// Edge Function "kind-profil-anlegen": Eltern legen ein Kind-Profil an.
// Aufruf mit der Sitzung der Eltern: { "spitzname": "Mia", "klassenstufe": 7, "pin": "1234" }
//
// Legt den Anmelde-Benutzer des Kindes an (ohne echte E-Mail, mit einem Passwort,
// das nur der Server ableiten kann) und danach Profil, PIN-Hash und Einstellungen
// über kind_profil_anlegen. Die Profilgrenze des Abos prüft die Datenbank.

import { antwort, corsKopf, elternId, istPin, kindEmail, kindPasswort, serverClient } from '../_shared/lemuri.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKopf });
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST' });

  const eltern = await elternId(req);
  if (!eltern) return antwort(401, { fehler: 'Nur angemeldete Eltern' });

  let body: { spitzname?: string; klassenstufe?: number; pin?: string };
  try {
    body = await req.json();
  } catch {
    return antwort(400, { fehler: 'Ungültige Anfrage' });
  }

  const spitzname = (body.spitzname ?? '').trim();
  const klassenstufe = Number(body.klassenstufe);
  if (spitzname.length < 1 || spitzname.length > 30) return antwort(400, { fehler: 'Spitzname: 1 bis 30 Zeichen' });
  if (!Number.isInteger(klassenstufe) || klassenstufe < 5 || klassenstufe > 10) return antwort(400, { fehler: 'Klassenstufe 5 bis 10' });
  if (!istPin(body.pin)) return antwort(400, { fehler: 'PIN: genau vier Ziffern' });

  const server = serverClient();

  // 1. Anmelde-Benutzer des Kindes (rolle = kind, damit kein Eltern-Konto entsteht)
  const kindAuthId = crypto.randomUUID();
  const benutzer = await server.auth.admin.createUser({
    id: kindAuthId,
    email: kindEmail(kindAuthId),
    password: await kindPasswort(kindAuthId),
    email_confirm: true,
    user_metadata: { rolle: 'kind' },
  });
  if (benutzer.error || !benutzer.data.user) {
    return antwort(500, { fehler: 'Benutzer konnte nicht angelegt werden' });
  }

  // 2. Profil, PIN und Einstellungen
  const profil = await server.rpc('kind_profil_anlegen', {
    p_eltern_id: eltern,
    p_auth_user_id: benutzer.data.user.id,
    p_spitzname: spitzname,
    p_klassenstufe: klassenstufe,
    p_pin: body.pin,
  });
  if (profil.error) {
    // Aufräumen, damit kein Benutzer ohne Profil bleibt
    await server.auth.admin.deleteUser(benutzer.data.user.id);
    const grenze = profil.error.code === 'P0001';
    return antwort(grenze ? 409 : 500, {
      fehler: grenze ? 'Das Abo erlaubt kein weiteres aktives Profil.' : 'Profil konnte nicht angelegt werden',
    });
  }

  return antwort(200, { kind_id: profil.data });
});
