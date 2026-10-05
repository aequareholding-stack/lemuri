# Lemuri – Plan der nächsten Aufträge

Stand: 04.10.2026, nach LB-002. Die Auftragsnummern vergibt der Operator; die Buchstaben hier dienen nur dem Verweis. Die Reihenfolge ist ein Vorschlag: A bis C müssen vor D bis G liegen, der Rest kann teilweise parallel laufen.

| Nr. (Operator) | Kurzname | Beschreibung |
|---|---|---|
| LB-002 | **A – Supabase-Projekt und Migration** | Erledigt bis auf das Projekt selbst: Migrationen, RLS, Sichten, Themenkatalog und Löschlauf liegen im Repository. Offen: Projekt „lemuri“ in Frankfurt anlegen (wartet auf Jos Ja zu den Kosten), Migrationen und Seed einspielen, `pg_cron` einschalten, Edge Functions ausrollen, `LEMURI_KIND_GEHEIMNIS` setzen, E-Mail-Vorlagen für Bestätigung und Passwort-Reset auf Deutsch. |
| LB-002 (Teil) | **B – Eltern-Konto und Kind-Profil** | Erledigt: Registrierung und Anmeldung der Eltern, Anmeldung des Kindes (Familiencode, Profilwahl, PIN, Sperre), Datenbankseite für Profil anlegen, PIN setzen, Konto löschen, Testphase. Offen für einen Folgeauftrag: Bildschirme für Eltern zum Anlegen der Kind-Profile, Anzeige des Familiencodes, PIN neu setzen, Profil und Konto löschen, Passwort vergessen. |
| | **C – Design umsetzen** | Den Entwurf der fünf Bildschirme (Schrift, Farben, Karten, Chips, Chat-Blasen, Tab-Leiste, Dunkelmodus) als wiederverwendbare Komponenten bauen. Icon-Paket wählen. |
| | **D – Aufgabe per Text** | Bildschirm „Aufgabe“: Text eingeben, Anliegen wählen („weiß nicht, wie ich anfange“ usw.). Aufgabe speichern, Thema automatisch zuordnen. |
| | **E – Aufgabe per Foto** | Kamera und Bildauswahl. Bild an die Edge Function `aufgabe-auslesen` schicken, die Claude den Text aus dem Bild lesen lässt; Kind bestätigt („Stimmt so“ / „Neues Foto“). Bild wird nirgends gespeichert. Ein eigener Auslese-Dienst bleibt später möglich. |
| | **F – Gespräch mit der KI** | Edge Function `gespraech-antwort` mit austauschbarer Anbieter-Schicht (siehe Datenmodell, Abschnitt 8); erste Umsetzung: Claude Sonnet über Amazon Bedrock Frankfurt (vorher Freischaltung der Sonnet-Version prüfen, sonst Google Vertex AI in der EU). System-Anweisung: erklären statt lösen, nachfragen, Hinweise in drei Stufen, Lösungsweg loben, sich als KI zu erkennen geben. Nachrichten und Hinweise speichern. Hinweisleiste „0 von 3“. |
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
9. EU-Anbieter für Claude: Amazon Bedrock in Frankfurt. Vor dem KI-Auftrag prüfen, ob die gewünschte Sonnet-Version dort freigeschaltet ist, sonst Google Vertex AI in der EU.
10. PIN des Kindes: 4 Ziffern, Sperre nach fünf Fehlversuchen.
11. Testphase: 30 Tage ab Konto-Anlage, ohne Zahlungsmittel, eine Testphase je Eltern-E-Mail.
12. Mehr Kinder als gebucht: Die Eltern wählen das aktive Profil, die anderen werden gesperrt, nicht gelöscht.

Entschieden am 05.10.2026:

13. Eigenes Supabase-Projekt „lemuri“ in Frankfurt; Jo gibt etwa zehn US-Dollar im Monat (rund 9 Euro im Monat) frei.
14. Domain der künstlichen Kind-Adressen: `kind.lemuri.app` (lemuri.app gehört Jo). An diese Adressen wird nie etwas geschickt.
15. Die E-Mail-Prüfsumme gegen eine zweite Testphase wird nach 24 Monaten gelöscht.
16. Eltern bestätigen ihre E-Mail per Link, bevor sie sich zum ersten Mal anmelden.
17. Ins Supabase-Dashboard darf nur Jo, mit Zwei-Faktor-Anmeldung. Lemuri App arbeitet nur über den technischen Zugang und lädt niemanden ein.
18. Das Eltern-Passwort hat mindestens 8 Zeichen.

## Offene Fragen

Derzeit keine. Neue Fragen kommen mit dem jeweiligen Auftrag.
