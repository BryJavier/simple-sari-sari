import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProductListScreen } from '@/screens/products/ProductListScreen';
import type { ProductsStackParamList } from './types';

const Stack = createNativeStackNavigator<ProductsStackParamList>();

export function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProductList" component={ProductListScreen} />
    </Stack.Navigator>
  );
}
