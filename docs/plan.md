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

## Offene Fragen

Diese Fragen entscheidet der Operator. Zu jeder Frage stehen Antwortmöglichkeiten und eine Empfehlung.

1. **Welche Domain für die künstlichen Kind-Adressen?** Jeder Kind-Benutzer braucht in Supabase Auth eine E-Mail-Adresse. Es wird nie eine E-Mail dorthin geschickt, aber die Domain sollte Lemuri gehören, damit niemand Fremdes Post bekommen könnte.
   - a) `kind.lemuri.app`, wenn `lemuri.app` registriert ist oder wird (so im Code vorbelegt).
   - b) Eine andere Domain, die schon im Besitz ist.
   - **Empfehlung: a**, die Domain wird später ohnehin für Web-App und Absender-Adresse gebraucht.

2. **Wie lange bleibt der E-Mail-Hash für „eine Testphase je E-Mail“ gespeichert?** Er überlebt die Kontolöschung, sonst ließe sich die Testphase durch Löschen und Neuanlegen wiederholen.
   - a) Unbegrenzt. b) 24 Monate. c) 12 Monate.
   - **Empfehlung: b**, 24 Monate: lang genug gegen Missbrauch, trotzdem eine feste Frist für die Datenschutzerklärung.

3. **Müssen Eltern ihre E-Mail bestätigen, bevor sie sich anmelden können?**
   - a) Ja, Bestätigungslink zuerst (Supabase-Standard, so eingestellt).
   - b) Nein, sofort nutzbar, Bestätigung später.
   - **Empfehlung: a**, weil Familiencode und Kinderdaten an diese Adresse hängen.

4. **Wer darf in das Supabase-Dashboard?** Das Dashboard arbeitet mit vollen Rechten und könnte Gesprächsinhalte lesen; die Datenbankrolle `betreiber` schützt nur eine künftige eigene Betreiber-Oberfläche.
   - a) Nur Jo, mit Zwei-Faktor-Anmeldung; alle anderen bekommen später die Betreiber-Oberfläche.
   - b) Jo und Timo mit Zwei-Faktor-Anmeldung.
   - **Empfehlung: a** für den Start, Zugriffe im Dashboard-Protokoll nachvollziehbar.

5. **Mindestlänge des Eltern-Passworts?**
   - a) 8 Zeichen (so in der App vorgesehen). b) 12 Zeichen. c) 6 Zeichen (Supabase-Standard).
   - **Empfehlung: a**, im Supabase-Projekt auf 8 setzen, damit App und Server übereinstimmen.
