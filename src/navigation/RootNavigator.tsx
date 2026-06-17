import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabNavigator } from './BottomTabNavigator';
import { RootStackParamList } from './types';
import { useAppStore } from '@/stores/appStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { initialized, setInitialized } = useAppStore();

  useEffect(() => {
    setTimeout(() => setInitialized(true), 500);
  }, [setInitialized]);

  if (!initialized) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Root" component={BottomTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
