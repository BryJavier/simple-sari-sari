import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SellStack } from './SellStack';
import { ProductsStack } from './ProductsStack';
import { HistoryStack } from './HistoryStack';
import type { RootTabParamList } from './types';
import { useAppPalette } from '@/theme/useAppPalette';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function BottomTabs() {
  const palette = useAppPalette();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.text2,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 },
        tabBarIcon: ({ color, size }) => {
          const iconName: Record<keyof RootTabParamList, string> = {
            Sell: 'cart-outline',
            Products: 'package-variant',
            History: 'history',
          };
          return <MaterialCommunityIcons name={iconName[route.name] as any} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Sell" component={SellStack} />
      <Tab.Screen name="Products" component={ProductsStack} />
      <Tab.Screen name="History" component={HistoryStack} />
    </Tab.Navigator>
  );
}
