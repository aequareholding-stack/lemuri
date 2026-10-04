import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Knopf, Meldung } from '../components/Formular';
import { supabaseKonfiguriert } from '../lib/supabase';
import { abstand, farben } from '../theme';
import type { AnmeldungParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AnmeldungParamList, 'Willkommen'>;

export function WillkommenScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.seite, { paddingTop: insets.top + abstand.l }]}>
      <Text style={styles.marke}>Lemuri</Text>
      <Text style={styles.titel}>Dein Lernbegleiter für Mathe</Text>
      <Text style={styles.text}>
        Lemuri ist eine KI. Lemuri verrät keine fertigen Lösungen, sondern hilft dir, selbst draufzukommen.
      </Text>
      <View style={styles.knoepfe}>
        <Knopf titel="Ich bin ein Kind" onPress={() => navigation.navigate('KindAnmelden')} />
        <Knopf titel="Ich bin ein Elternteil" art="sekundaer" onPress={() => navigation.navigate('ElternAnmelden')} />
      </View>
      {!supabaseKonfiguriert ? (
        <Meldung text="Die App ist noch nicht mit einer Datenbank verbunden. Eine Anmeldung ist erst möglich, wenn .env ausgefüllt ist (siehe .env.example)." />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  seite: {
    flex: 1,
    backgroundColor: farben.hintergrund,
    paddingHorizontal: abstand.m,
    gap: abstand.m,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  marke: { fontSize: 14, fontWeight: '700', color: farben.gedaempft, letterSpacing: 1 },
  titel: { fontSize: 30, fontWeight: '800', color: farben.text, lineHeight: 36 },
  text: { fontSize: 17, color: farben.gedaempft, lineHeight: 24 },
  knoepfe: { gap: abstand.s, marginTop: abstand.s },
});
