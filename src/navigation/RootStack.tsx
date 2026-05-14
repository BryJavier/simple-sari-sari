import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabs } from './BottomTabs';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { DisplaySettingsScreen } from '@/screens/settings/DisplaySettingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={BottomTabs} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Settings' }}
      />
      <Stack.Screen
        name="DisplaySettings"
        component={DisplaySettingsScreen}
        options={{ headerShown: true, title: 'Display' }}
      />
    </Stack.Navigator>
  );
}
