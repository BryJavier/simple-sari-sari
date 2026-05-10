import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { DisplaySettingsScreen } from '@/screens/settings/DisplaySettingsScreen';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
      <Stack.Screen name="DisplaySettings" component={DisplaySettingsScreen} options={{ headerShown: true, title: 'Display' }} />
    </Stack.Navigator>
  );
}
