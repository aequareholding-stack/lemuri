import React from 'react';
import { Platzhalter } from '../components/Platzhalter';

export function StartScreen() {
  return (
    <Platzhalter
      titel="Woran hängst du gerade?"
      beschreibung="Hier wählt das Kind später: Aufgabe fotografieren oder abtippen, Fach wählen, zuletzt geübte Themen."
      hinweis="Lemuri ist eine KI. Lemuri verrät keine fertigen Lösungen, sondern hilft dir, selbst draufzukommen."
    />
  );
}
