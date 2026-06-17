import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '@/screens/home/HomeScreen';
import MyBarScreen from '@/screens/mybar/MyBarScreen';
import CustomMixScreen from '@/screens/custommix/CustomMixScreen';
import ArchiveScreen from '@/screens/archive/ArchiveScreen';
import { Colors } from '@/utils/colors';
import { BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: Colors.accent.neonBlue,
        tabBarInactiveTintColor: Colors.dark.text,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="MyBar"
        component={MyBarScreen}
        options={{
          title: 'My Bar',
          tabBarLabel: 'My Bar',
        }}
      />
      <Tab.Screen
        name="CustomMix"
        component={CustomMixScreen}
        options={{
          title: 'Mix',
          tabBarLabel: 'Custom Mix',
        }}
      />
      <Tab.Screen
        name="Archive"
        component={ArchiveScreen}
        options={{
          title: 'Archive',
          tabBarLabel: 'Archive',
        }}
      />
    </Tab.Navigator>
  );
}