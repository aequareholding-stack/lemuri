import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SitzungProvider } from './src/lib/sitzung';

export default function App() {
  return (
    <SafeAreaProvider>
      <SitzungProvider>
        <RootNavigator />
      </SitzungProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
