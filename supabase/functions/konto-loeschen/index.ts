// Edge Function "konto-loeschen": Eltern löschen ihr Konto mit allen Daten.
// Aufruf mit der Sitzung der Eltern, ohne weitere Angaben.
//
// Reihenfolge: zuerst die Anmelde-Benutzer aller Kinder über die Auth-Verwaltung
// löschen, dann den Eltern-Benutzer. Die Fremdschlüssel räumen den Rest weg:
// eltern_konto, abo, kind_profil, kind_pin, Aufgaben, Gespräche, Nachrichten,
// Hinweise, Prüfergebnisse, Lernzeit, Themenstand, Einstellungen.
// Übrig bleibt nur die Prüfsumme der E-Mail (24 Monate, gegen eine zweite Testphase).

import { antwort, corsKopf, elternId, serverClient } from '../_shared/lemuri.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKopf });
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST' });

  const eltern = await elternId(req);
  if (!eltern) return antwort(401, { fehler: 'Nur angemeldete Eltern' });

  const server = serverClient();

  const kinder = await server.from('kind_profil').select('auth_user_id').eq('eltern_id', eltern);
  if (kinder.error) return antwort(500, { fehler: 'Profile konnten nicht geladen werden' });

  for (const kind of kinder.data ?? []) {
    const { error } = await server.auth.admin.deleteUser(kind.auth_user_id);
    if (error) return antwort(500, { fehler: 'Ein Kind-Profil konnte nicht gelöscht werden' });
  }

  const { error } = await server.auth.admin.deleteUser(eltern);
  if (error) return antwort(500, { fehler: 'Konto konnte nicht gelöscht werden' });

  return antwort(200, { ok: true });
});
