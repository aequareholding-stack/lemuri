// Gemeinsame Bausteine der Edge Functions (Deno).
// Geheimnisse kommen nur aus Umgebungsvariablen, nie aus dem Repository:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (von Supabase gesetzt)
//   LEMURI_KIND_GEHEIMNIS (eigener Zufallswert, mindestens 32 Zeichen)

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsKopf = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function antwort(status: number, daten: unknown): Response {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { ...corsKopf, 'Content-Type': 'application/json' },
  });
}

export function umgebung(name: string): string {
  const wert = Deno.env.get(name);
  if (!wert) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return wert;
}

/** Client mit Server-Rechten (umgeht RLS). Nur innerhalb der Edge Function verwenden. */
export function serverClient(): SupabaseClient {
  return createClient(umgebung('SUPABASE_URL'), umgebung('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client mit den Rechten des aufrufenden Benutzers (RLS gilt). */
export function benutzerClient(req: Request): SupabaseClient {
  return createClient(umgebung('SUPABASE_URL'), umgebung('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Liefert die ID der angemeldeten Eltern oder null. */
export async function elternId(req: Request): Promise<string | null> {
  const { data, error } = await benutzerClient(req).auth.getUser();
  if (error || !data.user) return null;
  const rolle = (data.user.user_metadata as { rolle?: string } | null)?.rolle ?? 'eltern';
  return rolle === 'eltern' ? data.user.id : null;
}

/** Synthetische Anmelde-E-Mail des Kindes; es wird nie eine E-Mail dorthin verschickt. */
export function kindEmail(kindAuthId: string): string {
  return `kind-${kindAuthId}@kind.lemuri.app`;
}

/**
 * Server-Passwort des Kind-Benutzers: wird aus dem Geheimnis und der Benutzer-ID
 * abgeleitet, nirgends gespeichert und dem Kind nie gezeigt. Die PIN ist nie das Passwort.
 */
export async function kindPasswort(kindAuthId: string): Promise<string> {
  const schluessel = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(umgebung('LEMURI_KIND_GEHEIMNIS')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', schluessel, new TextEncoder().encode(`kind:${kindAuthId}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export function istPin(wert: unknown): wert is string {
  return typeof wert === 'string' && /^[0-9]{4}$/.test(wert);
}
