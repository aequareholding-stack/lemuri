# Lemuri – Plan der nächsten Aufträge

Stand: 04.10.2026, nach LB-001 und den Entscheidungen des Operators vom selben Tag. Die Auftragsnummern vergibt der Operator; die Buchstaben hier dienen nur dem Verweis. Die Reihenfolge ist ein Vorschlag: A bis C müssen vor D bis G liegen, der Rest kann teilweise parallel laufen.

| Nr. (Operator) | Kurzname | Beschreibung |
|---|---|---|
| | **A – Supabase-Projekt und Migration** | Projekt in Frankfurt anlegen. Tabellen, Hilfsfunktionen, RLS-Regeln und Sichten aus `docs/datenmodell.md` als SQL-Migration schreiben. Themenkatalog Mathe Klasse 5 bis 10 als Startdaten einspielen. Löschjobs (`pg_cron`) anlegen. |
| | **B – Eltern-Konto und Kind-Profil** | Registrierung und Anmeldung der Eltern (E-Mail + Passwort). Kind-Profil anlegen: Spitzname und Klassenstufe. Familiencode erzeugen und anzeigen, PIN je Kind setzen, Anmeldung des Kindes mit Familiencode + PIN über eine Edge Function (Sperre nach 5 Fehlversuchen). Konto mit allen Daten und einzelne Profile löschen. Testphase von 30 Tagen beim Anlegen des Kontos starten. |
| | **C – Design umsetzen** | Den Entwurf der fünf Bildschirme (Schrift, Farben, Karten, Chips, Chat-Blasen, Tab-Leiste, Dunkelmodus) als wiederverwendbare Komponenten bauen. Icon-Paket wählen. |
| | **D – Aufgabe per Text** | Bildschirm „Aufgabe“: Text eingeben, Anliegen wählen („weiß nicht, wie ich anfange“ usw.). Aufgabe speichern, Thema automatisch zuordnen. |
| | **E – Aufgabe per Foto** | Kamera und Bildauswahl. Bild an die Edge Function `aufgabe-auslesen` schicken, die Claude den Text aus dem Bild lesen lässt; Kind bestätigt („Stimmt so“ / „Neues Foto“). Bild wird nirgends gespeichert. Ein eigener Auslese-Dienst bleibt später möglich. |
| | **F – Gespräch mit der KI** | Edge Function `gespraech-antwort` mit austauschbarer Anbieter-Schicht (siehe Datenmodell, Abschnitt 8); erste Umsetzung: Claude Sonnet über einen Cloud-Anbieter mit EU-Standort. System-Anweisung: erklären statt lösen, nachfragen, Hinweise in drei Stufen, Lösungsweg loben, sich als KI zu erkennen geben. Nachrichten und Hinweise speichern. Hinweisleiste „0 von 3“. |
| | **G – Prüfung** | Nach dem Gespräch eine ähnliche Aufgabe stellen, Antwort prüfen, Selbsteinschätzung abfragen, Themenstand setzen („verstanden“ / „übt noch“). |
| | **H – Lernzeit, Tageslimit, Lernpause** | Lernsitzungen messen, Tagessumme bilden. Bei erreichtem Limit oder in der Lernpause freundlich sperren. Zeitzone beachten. |
| | **I – Eltern-Übersicht** | Bildschirm „Eltern“: Lernzeit der Woche als Balken, Themen mit Stand, Einstellungen (Tageslimit, Lernpause). Nur über die beiden Eltern-Sichten. |
| | **J – Abo über Apple und Google** | In-App-Kauf bei Apple und Google. 9,99 Euro für ein Kind, 14,99 Euro für bis zu drei Kinder, monatlich kündbar. Webhooks setzen den Abo-Status, Profilgrenze durchsetzen. Ablauf der 30-tägigen Testphase: keine neuen Aufgaben, Eltern-Übersicht bleibt, nichts wird gelöscht. |
| | **J2 – Zahlung im Browser** | Später, nach dem Start: Zahlungsanbieter für den Browser anbinden, gleicher Abo-Status wie bei den Stores. |
| | **K – Datenschutz und Löschung** | Datenschutzerklärung und Einwilligung der Eltern im Anmeldefluss. Auskunft und Datenexport. Löschregeln aus dem Datenmodell prüfen (Testfälle): Gespräche nach 90 Tagen, alles Weitere nur auf Wunsch der Eltern, keine automatische Löschung ruhender Konten. Vertrag mit dem EU-Cloud-Anbieter zu Speicherung und Training prüfen. |
| | **L – Qualität und Auslieferung** | GitHub Actions: Typprüfung, Lint, Web-Build. EAS Build für iOS und Android. Testflight / interner Test bei Google Play. Web-Veröffentlichung. |
| | **M – Inhaltliche Prüfung der KI** | Testgespräche mit echten Schulaufgaben Klasse 5 bis 10. Prüfen: Verrät Lemuri Lösungen? Sind Hinweise altersgerecht? Erkennt sich Lemuri als KI? Ergebnisse in die System-Anweisung zurückspielen. |
| | **N – Deutsch und Englisch** | Erst nach dem Start von Mathe: Themenkatalog erweitern, Fach-Chips freischalten, System-Anweisungen je Fach. |

## Entschieden am 04.10.2026

1. Anmeldung Kind: eigener Benutzer mit Familiencode und PIN.
2. Gespräche werden 90 Tage nach Gesprächsende gelöscht.
3. Foto auslesen: direkt mit Claude; ein eigener Auslese-Dienst ist später möglich.
4. KI-Modell: Claude über einen Cloud-Anbieter mit EU-Standort; der Anbieter bleibt austauschbar.
5. Abo: erst Apple und Google, Zahlung im Browser in einem späteren Schritt.
6. Inaktive Konten werden nie automatisch gelöscht; Eltern können Konto und Daten jederzeit selbst löschen.
7. Kostenlose Testphase: 30 Tage.
8. Zweige: immer `lb-nnn` passend zum Auftrag.

## Offene Fragen

Diese Fragen entscheidet der Operator. Zu jeder Frage stehen Antwortmöglichkeiten und eine Empfehlung.

1. **Welcher EU-Cloud-Anbieter für Claude?**
   - a) Amazon Bedrock, Region Frankfurt. Gleiche Region wie Supabase, Claude-Modelle dort verfügbar.
   - b) Google Vertex AI, Region in der EU (z. B. Belgien oder Frankfurt).
   - c) Microsoft Azure AI Foundry, Region in der EU.
   - **Empfehlung: a**, weil Daten und Modell dann in derselben Region liegen. Vor Auftrag F prüfen, ob die gewünschte Sonnet-Version in Frankfurt freigeschaltet ist; sonst b.

2. **Wie sieht die PIN des Kindes aus?**
   - a) 4 Ziffern. Für Klasse 5 leicht zu merken, zusammen mit Familiencode und Sperre nach 5 Fehlversuchen ausreichend.
   - b) 6 Ziffern. Sicherer, aber für jüngere Kinder sperriger.
   - **Empfehlung: a.**

3. **Wie startet die Testphase von 30 Tagen?**
   - a) In der App ohne Store, ab Konto-Anlage, ohne Zahlungsmittel. Niedrige Hürde; eine Testphase je Eltern-E-Mail.
   - b) Als Einführungsangebot über Apple und Google, Abo wird beim Start angelegt und läuft danach automatisch weiter. Weniger Abbrüche am Ende, aber Zahlungsmittel schon zu Beginn nötig.
   - **Empfehlung: a**, damit auch Browser-Nutzer ohne Store testen können.

4. **Was gilt bei zwei Kindern in der Testphase, wenn danach das Einzel-Abo gewählt wird?**
   - a) Eltern wählen beim Abschluss, welches Profil aktiv bleibt; die anderen werden gesperrt, nicht gelöscht.
   - b) Nur der Familien-Plan ist wählbar, solange mehr als ein Profil besteht.
   - **Empfehlung: a**, weil nichts gelöscht wird und die Eltern entscheiden.
