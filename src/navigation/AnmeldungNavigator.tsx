import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WillkommenScreen } from '../screens/WillkommenScreen';
import { ElternAnmeldenScreen } from '../screens/ElternAnmeldenScreen';
import { KindAnmeldenScreen } from '../screens/KindAnmeldenScreen';
import { farben } from '../theme';
import type { AnmeldungParamList } from './types';

const Stack = createNativeStackNavigator<AnmeldungParamList>();

export function AnmeldungNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Willkommen"
      screenOptions={{
        headerStyle: { backgroundColor: farben.hintergrund },
        headerShadowVisible: false,
        headerTintColor: farben.text,
        headerTitle: '',
        headerBackTitle: 'Zurück',
      }}
    >
      <Stack.Screen name="Willkommen" component={WillkommenScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ElternAnmelden" component={ElternAnmeldenScreen} />
      <Stack.Screen name="KindAnmelden" component={KindAnmeldenScreen} />
    </Stack.Navigator>
  );
}
