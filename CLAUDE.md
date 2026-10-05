# Arbeitsregeln für Lemuri App

Diese Regeln gelten für jede Sitzung in diesem Repository. Der Operator vergibt die Auftragsnummern (LB-001, LB-002, ...).

## Bericht am Ende jeder Arbeit (Pflicht)

Jede Arbeit endet mit einem Bericht. Das gilt für einen fertigen Auftrag, einen fertigen Teilschritt, eine Zusammenführung in main und für jeden Stopp wegen eines Blockers. Ohne Bericht ist die Arbeit nicht abgeschlossen. Der Bericht ist in einfacher Sprache und hat diesen Kopf:

```
BERICHT LB-xxx
Datum und Uhrzeit: TT.MM.JJJJ, HH:MM Uhr (deutsche Zeit)
Stand: fertig / nicht fertig
```

Danach:
- Was gebaut wurde, in drei bis fünf Punkten
- Was geprüft wurde und wie
- Offene Fragen, jede mit zwei bis drei Antwortmöglichkeiten und einer Empfehlung. Dieser Abschnitt fehlt nie: Gibt es keine neuen Fragen, werden alle noch unbeantworteten Fragen wiederholt; gibt es gar keine, steht dort „keine“.
- Was der Operator als Nächstes tun muss (Freigaben, Antworten, Zugänge)
- Beträge immer ganz ausgeschrieben, zum Beispiel 9,99 Euro
- Datum und Uhrzeit kommen aus der Uhr der Umgebung in deutscher Zeit, nie geschätzt

Ist ein Auftrag nicht fertig, steht ganz oben, was fehlt und was der Operator tun muss.

## Arbeitsweise

- Ist eine Auftragsnummer schon belegt (Zweig, Pull Request oder Eintrag in `docs/plan.md`), sofort melden und nicht bauen.
- Jeder Auftrag bekommt einen eigenen Zweig `lb-xxx` und einen Pull Request gegen `main`.
- Offene Fragen werden gesammelt, nicht selbst entschieden.
- Vor dem Push: `npm run typecheck` muss grün sein.
- Sprache in Code-Kommentaren, Dokumenten und Berichten: Deutsch.
