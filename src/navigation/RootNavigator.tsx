import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { StartScreen } from '../screens/StartScreen';
import { AufgabeScreen } from '../screens/AufgabeScreen';
import { GespraechScreen } from '../screens/GespraechScreen';
import { PruefungScreen } from '../screens/PruefungScreen';
import { ElternScreen } from '../screens/ElternScreen';
import { farben } from '../theme';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const lemuriTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: farben.akzent,
    background: farben.hintergrund,
    card: farben.flaeche,
    text: farben.text,
    border: farben.linie,
  },
};

// Einfache Symbole als Text, bis ein Icon-Paket gewählt ist.
const symbole: Record<keyof RootTabParamList, string> = {
  Start: '⌂',
  Aufgabe: '▣',
  Gespraech: '◌',
  Pruefung: '✓',
  Eltern: '☺',
};

function TabSymbol({ name, color }: { name: keyof RootTabParamList; color: string }) {
  return <Text style={{ color, fontSize: 20 }}>{symbole[name]}</Text>;
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={lemuriTheme}>
      <Tab.Navigator
        initialRouteName="Start"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: farben.akzent,
          tabBarInactiveTintColor: farben.gedaempft,
          tabBarIcon: ({ color }) => <TabSymbol name={route.name} color={color} />,
        })}
      >
        <Tab.Screen name="Start" component={StartScreen} options={{ title: 'Start' }} />
        <Tab.Screen name="Aufgabe" component={AufgabeScreen} options={{ title: 'Aufgabe' }} />
        <Tab.Screen name="Gespraech" component={GespraechScreen} options={{ title: 'Gespräch' }} />
        <Tab.Screen name="Pruefung" component={PruefungScreen} options={{ title: 'Prüfung' }} />
        <Tab.Screen name="Eltern" component={ElternScreen} options={{ title: 'Eltern' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
