import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feld, Knopf, Meldung } from '../components/Formular';
import { familieProfile, kindAnmelden, type FamilienProfil } from '../lib/anmeldung';
import { abstand, farben, radius } from '../theme';

type Schritt = 'code' | 'profil' | 'pin';

export function KindAnmeldenScreen() {
  const insets = useSafeAreaInsets();
  const [schritt, setSchritt] = useState<Schritt>('code');
  const [code, setCode] = useState('');
  const [profile, setProfile] = useState<FamilienProfil[]>([]);
  const [profil, setProfil] = useState<FamilienProfil | null>(null);
  const [pin, setPin] = useState('');
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);

  async function codePruefen() {
    setLaedt(true);
    setMeldung(null);
    try {
      const liste = await familieProfile(code);
      if (liste.length === 0) {
        setMeldung('Zu diesem Familiencode gibt es kein Profil. Frag deine Eltern nach dem richtigen Code.');
      } else {
        setProfile(liste);
        setSchritt('profil');
      }
    } catch (e) {
      setMeldung((e as Error).message);
    } finally {
      setLaedt(false);
    }
  }

  function profilWaehlen(p: FamilienProfil) {
    if (p.gesperrt) {
      setMeldung(`${p.spitzname} ist gerade gesperrt. Deine Eltern können eine neue PIN setzen.`);
      return;
    }
    setProfil(p);
    setPin('');
    setMeldung(null);
    setSchritt('pin');
  }

  async function anmelden() {
    if (!profil) return;
    setLaedt(true);
    setMeldung(null);
    try {
      const { ergebnis, verbleibendeVersuche } = await kindAnmelden(code, profil.kind_id, pin);
      if (ergebnis === 'falsch') {
        setPin('');
        setMeldung(`Die PIN stimmt nicht. Du hast noch ${verbleibendeVersuche ?? 0} Versuche.`);
      } else if (ergebnis === 'gesperrt') {
        setPin('');
        setMeldung('Fünfmal falsch: Dein Profil ist jetzt gesperrt. Deine Eltern können eine neue PIN setzen.');
      } else if (ergebnis === 'unbekannt') {
        setMeldung('Das hat nicht geklappt. Fang bitte noch einmal mit dem Familiencode an.');
        setSchritt('code');
      }
      // Bei "ok" übernimmt der SitzungProvider und die App wechselt zu den Bildschirmen.
    } catch (e) {
      setMeldung((e as Error).message);
    } finally {
      setLaedt(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.aussen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.inhalt, { paddingBottom: insets.bottom + abstand.l }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.titel}>Kind anmelden</Text>

        {schritt === 'code' ? (
          <>
            <Text style={styles.text}>Deine Eltern haben einen Familiencode. Tipp ihn hier ein.</Text>
            <Feld
              label="Familiencode"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              autoCapitalize="characters"
              placeholder="8 Zeichen, z. B. KQ7M2XBA"
              maxLength={8}
            />
            {meldung ? <Meldung text={meldung} art="fehler" /> : null}
            <Knopf titel="Weiter" onPress={codePruefen} laedt={laedt} deaktiviert={code.length !== 8} />
          </>
        ) : null}

        {schritt === 'profil' ? (
          <>
            <Text style={styles.text}>Wer bist du?</Text>
            <View style={styles.liste}>
              {profile.map((p) => (
                <Pressable key={p.kind_id} onPress={() => profilWaehlen(p)} style={({ pressed }) => [styles.karte, pressed && styles.karteGedrueckt]} accessibilityRole="button">
                  <Text style={styles.karteName}>{p.spitzname}</Text>
                  {p.gesperrt ? <Text style={styles.karteHinweis}>gesperrt</Text> : null}
                </Pressable>
              ))}
            </View>
            {meldung ? <Meldung text={meldung} art="fehler" /> : null}
            <Knopf titel="Anderer Familiencode" art="sekundaer" onPress={() => { setSchritt('code'); setMeldung(null); }} />
          </>
        ) : null}

        {schritt === 'pin' && profil ? (
          <>
            <Text style={styles.text}>Hallo {profil.spitzname}! Gib deine PIN ein.</Text>
            <Feld
              label="PIN (4 Ziffern)"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
            />
            {meldung ? <Meldung text={meldung} art="fehler" /> : null}
            <Knopf titel="Los geht's" onPress={anmelden} laedt={laedt} deaktiviert={pin.length !== 4} />
            <Knopf titel="Zurück" art="sekundaer" onPress={() => { setSchritt('profil'); setMeldung(null); }} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aussen: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: { padding: abstand.m, gap: abstand.m, maxWidth: 480, width: '100%', alignSelf: 'center' },
  titel: { fontSize: 28, fontWeight: '800', color: farben.text },
  text: { fontSize: 17, color: farben.gedaempft, lineHeight: 24 },
  liste: { gap: abstand.s },
  karte: {
    backgroundColor: farben.flaeche,
    borderRadius: radius.karte,
    padding: abstand.m,
    borderWidth: 1,
    borderColor: farben.linie,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  karteGedrueckt: { opacity: 0.7 },
  karteName: { fontSize: 18, fontWeight: '700', color: farben.text },
  karteHinweis: { fontSize: 13, color: farben.akzent, fontWeight: '700' },
});
