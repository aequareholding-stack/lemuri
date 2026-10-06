// Edge Function "kind-profil-loeschen": Eltern löschen ein einzelnes Kind-Profil.
// Aufruf mit der Sitzung der Eltern: { "kind_id": "..." }
//
// Gelöscht wird der Anmelde-Benutzer des Kindes über die Auth-Verwaltung; die
// Fremdschlüssel entfernen damit Profil, PIN, Aufgaben, Gespräche, Nachrichten,
// Hinweise, Prüfergebnisse, Lernzeit, Themenstand und Einstellungen des Kindes.

import { antwort, corsKopf, elternId, serverClient } from '../_shared/lemuri.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKopf });
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST' });

  const eltern = await elternId(req);
  if (!eltern) return antwort(401, { fehler: 'Nur angemeldete Eltern' });

  let body: { kind_id?: string };
  try {
    body = await req.json();
  } catch {
    return antwort(400, { fehler: 'Ungültige Anfrage' });
  }
  if (!body.kind_id) return antwort(400, { fehler: 'Profil nötig' });

  const server = serverClient();
  const profil = await server
    .from('kind_profil')
    .select('auth_user_id')
    .eq('id', body.kind_id)
    .eq('eltern_id', eltern)
    .maybeSingle();
  if (profil.error) return antwort(500, { fehler: 'Profil konnte nicht geladen werden' });
  if (!profil.data) return antwort(404, { fehler: 'Kein Profil dieser Eltern' });

  const { error } = await server.auth.admin.deleteUser(profil.data.auth_user_id);
  if (error) return antwort(500, { fehler: 'Profil konnte nicht gelöscht werden' });

  return antwort(200, { ok: true });
});
