# Lemuri

Lemuri ist ein KI-Lernbegleiter für Schülerinnen und Schüler der Klassen 5 bis 10, zunächst für Mathe. Lemuri erklärt, statt Lösungen zu liefern: Er fragt nach, gibt Hinweise in drei Stufen, prüft das Verständnis mit einer ähnlichen Aufgabe und lobt den Lösungsweg. Lemuri ist ein Werkzeug, kein Spiel, und gibt sich immer offen als KI zu erkennen.

Das Konto legen die Eltern an, das Kind bekommt darunter ein Profil. Eltern sehen Lernzeit und Themen mit Stand, aber keine einzelnen Gespräche.

## Stand

Auftrag LB-001: Projektgerüst mit fünf leeren Bildschirmen und Navigation (Start, Aufgabe, Gespräch, Prüfung, Eltern). Noch keine Logik, keine KI-Anbindung, kein Supabase-Projekt.

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
npm start
```

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

## Ordner

```
App.tsx                  Einstieg, Navigation einhängen
src/navigation/          Tab-Navigation und Bildschirmnamen
src/screens/             die fünf Bildschirme
src/components/          gemeinsame Bausteine (derzeit ein Platzhalter)
src/theme.ts             Farben und Abstände
docs/                    Datenmodell und Plan
```
