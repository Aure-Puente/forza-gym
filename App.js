import React, { useEffect, useMemo, useState } from "react";
import { useColorScheme, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { getLiftLogTheme } from "./src/theme/theme";

const THEME_MODE_KEY = "@forte_theme_mode";
const COLOR_PRESET_KEY = "@forte_color_preset";

export default function App() {
  const colorScheme = useColorScheme();

  const [themeMode, setThemeMode] = useState("system");
  const [colorPreset, setColorPreset] = useState("green");

  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem(THEME_MODE_KEY);
        const savedColorPreset = await AsyncStorage.getItem(COLOR_PRESET_KEY);

        if (
          savedThemeMode === "system" ||
          savedThemeMode === "light" ||
          savedThemeMode === "dark"
        ) {
          setThemeMode(savedThemeMode);
        }

        if (savedColorPreset) {
          setColorPreset(savedColorPreset);
        }
      } catch (error) {
        console.log("Error cargando preferencias:", error);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    const savePreferences = async () => {
      try {
        await AsyncStorage.setItem(THEME_MODE_KEY, themeMode);
        await AsyncStorage.setItem(COLOR_PRESET_KEY, colorPreset);
      } catch (error) {
        console.log("Error guardando preferencias:", error);
      }
    };

    savePreferences();
  }, [themeMode, colorPreset, preferencesLoaded]);

  const isDark = useMemo(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;

    return colorScheme === "dark";
  }, [themeMode, colorScheme]);

  const theme = useMemo(() => {
    return getLiftLogTheme({
      themeMode,
      colorPreset,
      systemColorScheme: colorScheme,
    });
  }, [themeMode, colorPreset, colorScheme]);

  const statusBarStyle = isDark ? "light" : "dark";
  const statusBarBackground = theme.colors.background;

  if (!preferencesLoaded) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar
            style={statusBarStyle}
            backgroundColor={statusBarBackground}
            translucent={false}
          />

          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer theme={theme}>
            <StatusBar
              style={statusBarStyle}
              backgroundColor={statusBarBackground}
              translucent={false}
            />

            <AppNavigator
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              colorPreset={colorPreset}
              setColorPreset={setColorPreset}
            />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}