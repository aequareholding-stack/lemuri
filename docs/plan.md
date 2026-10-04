# Lemuri – Plan der nächsten Aufträge

Stand: 04.10.2026, nach LB-001. Die Auftragsnummern vergibt der Operator; die Buchstaben hier dienen nur dem Verweis. Die Reihenfolge ist ein Vorschlag: A bis C müssen vor D bis G liegen, der Rest kann teilweise parallel laufen.

| Nr. (Operator) | Kurzname | Beschreibung |
|---|---|---|
| | **A – Supabase-Projekt und Migration** | Projekt in Frankfurt anlegen. Tabellen, Hilfsfunktionen, RLS-Regeln und Sichten aus `docs/datenmodell.md` als SQL-Migration schreiben. Themenkatalog Mathe Klasse 5 bis 10 als Startdaten einspielen. Löschjobs (`pg_cron`) anlegen. |
| | **B – Eltern-Konto und Kind-Profil** | Registrierung und Anmeldung der Eltern (E-Mail + Passwort). Kind-Profil anlegen: Spitzname und Klassenstufe. Anmeldung des Kindes (je nach Entscheidung: Familiencode + PIN). Konto und Profil löschen. |
| | **C – Design umsetzen** | Den Entwurf der fünf Bildschirme (Schrift, Farben, Karten, Chips, Chat-Blasen, Tab-Leiste, Dunkelmodus) als wiederverwendbare Komponenten bauen. Icon-Paket wählen. |
| | **D – Aufgabe per Text** | Bildschirm „Aufgabe“: Text eingeben, Anliegen wählen („weiß nicht, wie ich anfange“ usw.). Aufgabe speichern, Thema automatisch zuordnen. |
| | **E – Aufgabe per Foto** | Kamera und Bildauswahl. Bild an den Auslese-Dienst schicken, Text zurückbekommen, Kind bestätigt („Stimmt so“ / „Neues Foto“). Bild wird nirgends gespeichert. |
| | **F – Gespräch mit der KI** | Edge Function, die Claude Sonnet aufruft. System-Anweisung: erklären statt lösen, nachfragen, Hinweise in drei Stufen, Lösungsweg loben, sich als KI zu erkennen geben. Nachrichten und Hinweise speichern. Hinweisleiste „0 von 3“. |
| | **G – Prüfung** | Nach dem Gespräch eine ähnliche Aufgabe stellen, Antwort prüfen, Selbsteinschätzung abfragen, Themenstand setzen („verstanden“ / „übt noch“). |
| | **H – Lernzeit, Tageslimit, Lernpause** | Lernsitzungen messen, Tagessumme bilden. Bei erreichtem Limit oder in der Lernpause freundlich sperren. Zeitzone beachten. |
| | **I – Eltern-Übersicht** | Bildschirm „Eltern“: Lernzeit der Woche als Balken, Themen mit Stand, Einstellungen (Tageslimit, Lernpause). Nur über die beiden Eltern-Sichten. |
| | **J – Abo** | In-App-Kauf bei Apple und Google, im Browser über einen Zahlungsanbieter. 9,99 Euro für ein Kind, 14,99 Euro für bis zu drei Kinder, monatlich kündbar. Webhooks setzen den Abo-Status, Profilgrenze durchsetzen. |
| | **K – Datenschutz und Löschung** | Datenschutzerklärung und Einwilligung der Eltern im Anmeldefluss. Auskunft und Datenexport. Löschregeln aus dem Datenmodell prüfen (Testfälle). Vertrag mit dem KI-Anbieter zu Speicherung und Training. |
| | **L – Qualität und Auslieferung** | GitHub Actions: Typprüfung, Lint, Web-Build. EAS Build für iOS und Android. Testflight / interner Test bei Google Play. Web-Veröffentlichung. |
| | **M – Inhaltliche Prüfung der KI** | Testgespräche mit echten Schulaufgaben Klasse 5 bis 10. Prüfen: Verrät Lemuri Lösungen? Sind Hinweise altersgerecht? Erkennt sich Lemuri als KI? Ergebnisse in die System-Anweisung zurückspielen. |
| | **N – Deutsch und Englisch** | Erst nach dem Start von Mathe: Themenkatalog erweitern, Fach-Chips freischalten, System-Anweisungen je Fach. |

## Offene Fragen

Diese Fragen entscheidet der Operator. Zu jeder Frage stehen Antwortmöglichkeiten und eine Empfehlung.

1. **Wie meldet sich das Kind an?**
   - a) Eigener Anmelde-Benutzer ohne E-Mail, Anmeldung mit Familiencode + PIN. Die Datenbank kann dann Kind und Eltern sicher unterscheiden.
   - b) Eltern melden sich an, Kind wählt sein Profil (ggf. mit PIN). Einfacher, aber die Datenbank sieht nur die Eltern; der Schutz der Gespräche hängt dann allein an der App.
   - c) Kind bekommt eine eigene E-Mail-Anmeldung. Widerspricht „nur das Nötigste speichern“.
   - **Empfehlung: a.** Nur so greift Row Level Security für den Gesprächsschutz.

2. **Wie lange bleiben Gespräche gespeichert?**
   - a) 30 Tage. b) 90 Tage. c) 12 Monate.
   - **Empfehlung: b, 90 Tage.** Lang genug, damit das Kind „zuletzt geübt“ wiederfindet; kurz genug für Datensparsamkeit. Zähler und Themenstand bleiben länger.

3. **Womit wird das Foto ausgelesen?**
   - a) Direkt mit dem KI-Modell (Claude kann Bilder lesen). Ein Dienst weniger, ein Vertrag weniger.
   - b) Eigener Auslese-Dienst (z. B. spezialisierte Mathe-Texterkennung). Genauer bei Formeln, aber ein weiterer Anbieter mit Kinderdaten.
   - c) Auslesen auf dem Gerät. Datensparsam, aber bei Handschrift und Formeln schwach.
   - **Empfehlung: a.** Erst messen, wie gut es bei echten Heften ist; auf b wechseln, falls nötig.

4. **Wo läuft das KI-Modell (Standort der Daten)?**
   - a) Anthropic-API direkt, mit Datenschutzvertrag und ohne Speicherung/Training. Einfachste Anbindung, Server in den USA.
   - b) Über einen Cloud-Anbieter mit Standort in der EU (z. B. Frankfurt), der Claude Sonnet anbietet. Daten bleiben in der EU, etwas mehr Aufwand.
   - **Empfehlung: zuerst mit dem Datenschutzberater klären, ob für Kinderdaten ein EU-Standort Pflicht ist. Wenn ja: b. Wenn nein: a mit Vertragsklausel.**

5. **Wie wird das Abo abgewickelt?**
   - a) Nur über Apple und Google (in den Apps Pflicht). Im Browser kein Kauf, nur Nutzung.
   - b) Apple und Google in den Apps, im Browser ein Zahlungsanbieter (z. B. Stripe). Mehr Aufwand, aber im Browser direkt buchbar und ohne Store-Gebühr.
   - **Empfehlung: b, aber in zwei Schritten:** erst Stores (zum Start), Browser-Zahlung danach.

6. **Wann werden inaktive Konten automatisch gelöscht?**
   - a) 6 Monate nach Abo-Ende. b) 12 Monate. c) Nie automatisch, nur auf Wunsch.
   - **Empfehlung: b, 12 Monate,** mit E-Mail 30 Tage vorher. So ist im Datenmodell vorläufig eingetragen.

7. **Gibt es eine kostenlose Testphase?**
   - a) Keine. b) 7 Tage. c) 14 Tage.
   - **Empfehlung: b, 7 Tage.** Eltern sehen in einer Woche, ob das Kind es nutzt.

8. **Wie heißt der Zweig für Aufträge?**
   - Dieser Auftrag liegt auf `lb-001`, wie gewünscht. Die Umgebung des Operators hatte zusätzlich den Zweig `claude/wizardly-hamilton-672lr4` vorgegeben; er enthält denselben Stand.
   - a) Weiter `lb-xxx` je Auftrag. b) Die von der Umgebung vorgegebenen Zweige.
   - **Empfehlung: a,** die Nummer ist lesbar und passt zum Plan.
