import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feld, Knopf, Meldung } from '../components/Formular';
import { elternAnmelden, elternRegistrieren } from '../lib/anmeldung';
import { abstand, farben } from '../theme';

export function ElternAnmeldenScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [laedt, setLaedt] = useState<'anmelden' | 'registrieren' | null>(null);
  const [meldung, setMeldung] = useState<{ text: string; art: 'fehler' | 'erfolg' } | null>(null);

  const eingabeOk = email.includes('@') && passwort.length >= 8;

  async function anmelden() {
    setLaedt('anmelden');
    setMeldung(null);
    try {
      await elternAnmelden(email, passwort);
      // Die Sitzung übernimmt der SitzungProvider; die Navigation wechselt von selbst.
    } catch (e) {
      setMeldung({ text: (e as Error).message, art: 'fehler' });
    } finally {
      setLaedt(null);
    }
  }

  async function registrieren() {
    setLaedt('registrieren');
    setMeldung(null);
    try {
      const ergebnis = await elternRegistrieren(email, passwort);
      if (ergebnis === 'bestaetigen') {
        setMeldung({ text: 'Fast geschafft: Bitte bestätige deine E-Mail über den Link, den wir dir geschickt haben.', art: 'erfolg' });
      }
    } catch (e) {
      setMeldung({ text: (e as Error).message, art: 'fehler' });
    } finally {
      setLaedt(null);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.aussen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: insets.bottom + abstand.l }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.titel}>Eltern anmelden</Text>
        <Text style={styles.text}>
          Mit dem Eltern-Konto legst du Profile für deine Kinder an und siehst Lernzeit und Themen. Gespräche deiner Kinder mit Lemuri siehst du nicht.
        </Text>
        <Feld label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" textContentType="emailAddress" placeholder="name@beispiel.de" />
        <Feld label="Passwort" value={passwort} onChangeText={setPasswort} secureTextEntry textContentType="password" placeholder="mindestens 8 Zeichen" />
        {meldung ? <Meldung text={meldung.text} art={meldung.art} /> : null}
        <Knopf titel="Anmelden" onPress={anmelden} laedt={laedt === 'anmelden'} deaktiviert={!eingabeOk || laedt !== null} />
        <Knopf titel="Neues Konto anlegen" art="sekundaer" onPress={registrieren} laedt={laedt === 'registrieren'} deaktiviert={!eingabeOk || laedt !== null} />
        <Text style={styles.klein}>Mit dem Anlegen startet eine kostenlose Testphase von 30 Tagen. Danach 9,99 Euro im Monat für ein Kind oder 14,99 Euro im Monat für bis zu drei Kinder, monatlich kündbar.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aussen: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: { padding: abstand.m, gap: abstand.m, maxWidth: 480, width: '100%', alignSelf: 'center' },
  titel: { fontSize: 28, fontWeight: '800', color: farben.text },
  text: { fontSize: 16, color: farben.gedaempft, lineHeight: 23 },
  klein: { fontSize: 13, color: farben.gedaempft, lineHeight: 19 },
});
