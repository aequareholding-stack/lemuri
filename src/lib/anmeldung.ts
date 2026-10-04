// Anmeldefunktionen für Eltern und Kind. Noch keine KI, nur Supabase Auth
// und die Edge Function "kind-anmelden".
import { supabase, supabaseKonfiguriert } from './supabase';

export type Rolle = 'eltern' | 'kind';

export type FamilienProfil = {
  kind_id: string;
  spitzname: string;
  gesperrt: boolean;
};

export type KindAnmeldungErgebnis = 'ok' | 'falsch' | 'gesperrt' | 'unbekannt';

function pruefeKonfiguration() {
  if (!supabaseKonfiguriert) {
    throw new Error('Die App ist noch nicht mit Supabase verbunden (siehe .env.example).');
  }
}

export async function elternRegistrieren(email: string, passwort: string): Promise<'bestaetigen' | 'angemeldet'> {
  pruefeKonfiguration();
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: passwort });
  if (error) throw new Error(fehlertext(error.message));
  return data.session ? 'angemeldet' : 'bestaetigen';
}

export async function elternAnmelden(email: string, passwort: string): Promise<void> {
  pruefeKonfiguration();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: passwort });
  if (error) throw new Error(fehlertext(error.message));
}

export async function familieProfile(familiencode: string): Promise<FamilienProfil[]> {
  pruefeKonfiguration();
  const { data, error } = await supabase.functions.invoke<{ profile: FamilienProfil[]; fehler?: string }>('kind-anmelden', {
    body: { aktion: 'profile', familiencode: familiencode.trim().toUpperCase() },
  });
  if (error || !data) throw new Error('Familiencode konnte nicht geprüft werden.');
  if (data.fehler) throw new Error(data.fehler);
  return data.profile;
}

type KindAnmeldungAntwort = {
  ergebnis: KindAnmeldungErgebnis;
  access_token?: string;
  refresh_token?: string;
  verbleibende_versuche?: number;
};

export async function kindAnmelden(
  familiencode: string,
  kindId: string,
  pin: string,
): Promise<{ ergebnis: KindAnmeldungErgebnis; verbleibendeVersuche?: number }> {
  pruefeKonfiguration();
  const { data, error } = await supabase.functions.invoke<KindAnmeldungAntwort>('kind-anmelden', {
    body: { aktion: 'anmelden', familiencode: familiencode.trim().toUpperCase(), kind_id: kindId, pin },
  });
  // Bei 401 liefert supabase-js einen Fehler; die Antwort steckt im Kontext.
  const antwort = data ?? (await antwortAusFehler(error));
  if (!antwort) throw new Error('Anmeldung nicht möglich.');
  if (antwort.ergebnis === 'ok' && antwort.access_token && antwort.refresh_token) {
    const { error: sitzungFehler } = await supabase.auth.setSession({
      access_token: antwort.access_token,
      refresh_token: antwort.refresh_token,
    });
    if (sitzungFehler) throw new Error('Sitzung konnte nicht gespeichert werden.');
  }
  return { ergebnis: antwort.ergebnis, verbleibendeVersuche: antwort.verbleibende_versuche };
}

export async function abmelden(): Promise<void> {
  await supabase.auth.signOut();
}

async function antwortAusFehler(error: unknown): Promise<KindAnmeldungAntwort | null> {
  const kontext = (error as { context?: Response } | null)?.context;
  if (!kontext || typeof kontext.json !== 'function') return null;
  try {
    return await kontext.json();
  } catch {
    return null;
  }
}

function fehlertext(original: string): string {
  if (/invalid login credentials/i.test(original)) return 'E-Mail oder Passwort stimmt nicht.';
  if (/already registered/i.test(original)) return 'Diese E-Mail ist schon registriert.';
  if (/password should be at least/i.test(original)) return 'Das Passwort ist zu kurz.';
  if (/email not confirmed/i.test(original)) return 'Bitte bestätige zuerst deine E-Mail.';
  return original;
}
