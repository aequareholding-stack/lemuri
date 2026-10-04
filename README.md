# Lemuri

Lemuri ist ein KI-Lernbegleiter für Schülerinnen und Schüler der Klassen 5 bis 10, zunächst für Mathe. Lemuri erklärt, statt Lösungen zu liefern: Er fragt nach, gibt Hinweise in drei Stufen, prüft das Verständnis mit einer ähnlichen Aufgabe und lobt den Lösungsweg. Lemuri ist ein Werkzeug, kein Spiel, und gibt sich immer offen als KI zu erkennen.

Das Konto legen die Eltern an, das Kind bekommt darunter ein Profil. Eltern sehen Lernzeit und Themen mit Stand, aber keine einzelnen Gespräche.

## Stand

- LB-001: Projektgerüst mit fünf leeren Bildschirmen und Navigation (Start, Aufgabe, Gespräch, Prüfung, Eltern).
- LB-002: Datenbank als Migrationen, Zugriffsregeln (Row Level Security), Anmeldung für Eltern (E-Mail) und Kind (Familiencode + PIN), Schutz-Tests. Noch keine KI-Anbindung.

- Datenmodell: [`docs/datenmodell.md`](docs/datenmodell.md)
- Nächste Schritte und offene Fragen: [`docs/plan.md`](docs/plan.md)

## Technik

- Expo (SDK 57) mit React Native und TypeScript, ein Code für iPhone, Android und Browser
- Navigation: React Navigation (Tab-Leiste unten)
- Daten (geplant): Supabase, Region Frankfurt
- KI (geplant): Claude Sonnet

## App starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
cp .env.example .env   # Supabase-URL und veröffentlichbaren Schlüssel eintragen
npm start
```

Ohne ausgefüllte `.env` startet die App trotzdem, zeigt aber auf dem Startbildschirm, dass keine Datenbank verbunden ist.

Danach im Terminal:

- `w` öffnet die App im Browser
- `a` öffnet sie im Android-Emulator (Android Studio nötig)
- `i` öffnet sie im iOS-Simulator (nur auf dem Mac, Xcode nötig)

Auf einem echten Handy: die App „Expo Go“ installieren und den QR-Code aus dem Terminal scannen. Handy und Rechner müssen im selben WLAN sein.

Direkt im Browser starten:

```bash
npm run web
```

Typprüfung:

```bash
npm run typecheck
```

## Datenbank

Alles zur Datenbank liegt unter `supabase/`: Migrationen, Startdaten (Themenkatalog), Edge Functions und Tests. Das Datenmodell ist in `docs/datenmodell.md` beschrieben.

Schutz-Tests lokal ausführen (braucht ein laufendes PostgreSQL 16 oder 17, Verbindung über `LEMURI_TEST_PG`, Standard `postgres://postgres@127.0.0.1:54329/postgres`):

```bash
npm run test:db
```

Der Test-Läufer legt die Datenbank `lemuri_test` neu an, spielt eine Nachbildung der Supabase-Umgebung, alle Migrationen und die Startdaten ein und prüft unter anderem: Eltern lesen keine Gespräche, Kinder sehen nichts voneinander, Familien sehen nichts voneinander, nach fünf falschen PINs ist das Profil gesperrt.

In das Supabase-Projekt kommen die Migrationen mit der Supabase-CLI (`supabase db push`), die Edge Functions mit `supabase functions deploy`. Schlüssel und Geheimnisse werden nur im Supabase-Dashboard hinterlegt, nie im Repository.

## Ordner

```
App.tsx                  Einstieg, Navigation einhängen
src/navigation/          Tab-Navigation und Bildschirmnamen
src/screens/             Willkommen, Eltern anmelden, Kind anmelden und die fünf Bildschirme
src/components/          gemeinsame Bausteine (Platzhalter, Formular)
src/lib/                 Supabase-Client, Anmeldung, Sitzung
src/theme.ts             Farben und Abstände
supabase/                Migrationen, Startdaten, Edge Functions, Tests
docs/                    Datenmodell und Plan
```
