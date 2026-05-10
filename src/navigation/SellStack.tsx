import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SellScreen } from '@/screens/sell/SellScreen';
import type { SellStackParamList } from './types';

const Stack = createNativeStackNavigator<SellStackParamList>();

export function SellStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellHome" component={SellScreen} />
    </Stack.Navigator>
  );
}
