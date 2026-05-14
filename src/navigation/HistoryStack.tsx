import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryScreen } from '@/screens/history/HistoryScreen';
import type { HistoryStackParamList } from './types';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryHome" component={HistoryScreen} />
    </Stack.Navigator>
  );
}
