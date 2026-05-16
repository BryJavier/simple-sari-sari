import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DatabaseProvider } from '@/db/DatabaseProvider';
import { RootStack } from '@/navigation/RootStack';
import { deriveTokens } from '@/theme/palette';
import { useSettingsStore } from '@/store/settings';
import { PRESET_HUES } from '@/theme/types';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const themePreset = useSettingsStore((s) => s.themePreset);
  const themeCustomHue = useSettingsStore((s) => s.themeCustomHue);
  const themeDarkMode = useSettingsStore((s) => s.themeDarkMode);
  const hue = themePreset === 'custom' ? themeCustomHue : PRESET_HUES[themePreset as Exclude<typeof themePreset, 'custom'>];
  const palette = deriveTokens(hue, themeDarkMode);

  if (fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, padding: 24 }}>
        <Text style={{ color: palette.danger, textAlign: 'center' }}>Font load error: {fontError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface }}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <ThemeProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootStack />
          </NavigationContainer>
        </ThemeProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
