import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { abstand, farben, radius } from '../theme';

export function Feld({ label, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={styles.feld}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.eingabe}
        placeholderTextColor={farben.gedaempft}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
    </View>
  );
}

type KnopfProps = {
  titel: string;
  onPress: () => void;
  art?: 'primaer' | 'sekundaer';
  laedt?: boolean;
  deaktiviert?: boolean;
};

export function Knopf({ titel, onPress, art = 'primaer', laedt, deaktiviert }: KnopfProps) {
  const sekundaer = art === 'sekundaer';
  return (
    <Pressable
      onPress={onPress}
      disabled={laedt || deaktiviert}
      style={({ pressed }) => [
        styles.knopf,
        sekundaer && styles.knopfSekundaer,
        (pressed || laedt || deaktiviert) && styles.knopfGedrueckt,
      ]}
      accessibilityRole="button"
    >
      {laedt ? (
        <ActivityIndicator color={sekundaer ? farben.text : farben.akzentText} />
      ) : (
        <Text style={[styles.knopfText, sekundaer && styles.knopfTextSekundaer]}>{titel}</Text>
      )}
    </Pressable>
  );
}

export function Meldung({ text, art = 'hinweis' }: { text: string; art?: 'hinweis' | 'fehler' | 'erfolg' }) {
  return (
    <View style={[styles.meldung, art === 'fehler' && styles.meldungFehler, art === 'erfolg' && styles.meldungErfolg]}>
      <Text style={styles.meldungText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  feld: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: farben.gedaempft, letterSpacing: 1, textTransform: 'uppercase' },
  eingabe: {
    backgroundColor: farben.flaeche,
    borderWidth: 1.5,
    borderColor: farben.linie,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: farben.text,
  },
  knopf: {
    backgroundColor: farben.akzent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: abstand.m,
    alignItems: 'center',
  },
  knopfSekundaer: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: farben.linie },
  knopfGedrueckt: { opacity: 0.6 },
  knopfText: { color: farben.akzentText, fontWeight: '700', fontSize: 17 },
  knopfTextSekundaer: { color: farben.text },
  meldung: { backgroundColor: farben.akzentHell, borderRadius: radius.karte, padding: abstand.m },
  meldungFehler: { backgroundColor: '#fde3e3' },
  meldungErfolg: { backgroundColor: farben.gruenHell },
  meldungText: { color: farben.text, fontSize: 15, lineHeight: 21 },
});
