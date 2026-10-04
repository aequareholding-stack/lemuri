import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { abstand, farben, radius } from '../theme';

type Props = {
  titel: string;
  beschreibung: string;
  hinweis?: string;
};

/**
 * Leerer Bildschirm mit Überschrift und kurzer Beschreibung.
 * Dient als Gerüst, bis die echte Logik kommt (siehe docs/plan.md).
 */
export function Platzhalter({ titel, beschreibung, hinweis }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.inhalt, { paddingTop: insets.top + abstand.m }]}
    >
      <Text style={styles.marke}>Lemuri</Text>
      <Text style={styles.titel}>{titel}</Text>
      <Text style={styles.beschreibung}>{beschreibung}</Text>
      <View style={styles.karte}>
        <Text style={styles.karteText}>Hier entsteht der Bildschirm „{titel}“.</Text>
      </View>
      {hinweis ? (
        <View style={styles.hinweis}>
          <Text style={styles.hinweisText}>{hinweis}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: farben.hintergrund },
  inhalt: {
    paddingHorizontal: abstand.m,
    paddingBottom: abstand.l,
    gap: abstand.m,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  marke: { fontSize: 14, fontWeight: '700', color: farben.gedaempft, letterSpacing: 1 },
  titel: { fontSize: 28, fontWeight: '800', color: farben.text, lineHeight: 34 },
  beschreibung: { fontSize: 17, color: farben.gedaempft, lineHeight: 24 },
  karte: {
    backgroundColor: farben.flaeche,
    borderRadius: radius.karte,
    padding: abstand.m,
    borderWidth: 1,
    borderColor: farben.linie,
  },
  karteText: { fontSize: 16, color: farben.text },
  hinweis: {
    backgroundColor: farben.akzentHell,
    borderRadius: radius.karte,
    padding: abstand.m,
  },
  hinweisText: { fontSize: 14, color: farben.text, lineHeight: 20 },
});
