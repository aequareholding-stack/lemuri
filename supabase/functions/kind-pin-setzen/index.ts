// Edge Function "kind-pin-setzen": Eltern setzen eine neue PIN und heben damit
// eine Sperre nach fünf Fehlversuchen auf.
// Aufruf mit der Sitzung der Eltern: { "kind_id": "...", "pin": "1234" }

import { antwort, corsKopf, elternId, istPin, serverClient } from '../_shared/lemuri.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsKopf });
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST' });

  const eltern = await elternId(req);
  if (!eltern) return antwort(401, { fehler: 'Nur angemeldete Eltern' });

  let body: { kind_id?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return antwort(400, { fehler: 'Ungültige Anfrage' });
  }
  if (!body.kind_id || !istPin(body.pin)) return antwort(400, { fehler: 'Profil und vierstellige PIN nötig' });

  const { error } = await serverClient().rpc('kind_pin_setzen', {
    p_eltern_id: eltern,
    p_kind_id: body.kind_id,
    p_pin: body.pin,
  });
  if (error) return antwort(error.code === 'P0002' ? 404 : 500, { fehler: 'PIN konnte nicht gesetzt werden' });
  return antwort(200, { ok: true });
});
