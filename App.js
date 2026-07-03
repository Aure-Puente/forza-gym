//App.js:
import React, { useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";
import { ActivityIndicator, PaperProvider } from "react-native-paper";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { getLiftLogTheme } from "./src/theme/theme";

const THEME_MODE_KEY = "@forte_theme_mode";
const COLOR_PRESET_KEY = "@forte_color_preset";

function AppContent() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

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

  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onSurface,
        border: theme.colors.outlineVariant,
        notification: theme.colors.primary,
      },
    };
  }, [isDark, theme]);

  const statusBarStyle = isDark ? "light" : "dark";
  const statusBarBackground = theme.colors.background;

  useEffect(() => {
    const configureSystemBars = async () => {
      if (Platform.OS !== "android") return;

      try {
        await NavigationBar.setBackgroundColorAsync(theme.colors.surface);
        await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
      } catch (error) {
        console.log("NAVIGATION BAR CONFIG ERROR:", error);
      }
    };

    configureSystemBars();
  }, [isDark, theme]);

  const StatusBarBackground = () => {
    return (
      <View
        style={{
          height: insets.top,
          backgroundColor: statusBarBackground,
        }}
      />
    );
  };

  if (!preferencesLoaded) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar
          style={statusBarStyle}
          backgroundColor={statusBarBackground}
          translucent
        />

        <StatusBarBackground />

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
    );
  }

  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <StatusBar
            style={statusBarStyle}
            backgroundColor={statusBarBackground}
            translucent
          />

          <StatusBarBackground />

          <NavigationContainer theme={navigationTheme}>
            <AppNavigator
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              colorPreset={colorPreset}
              setColorPreset={setColorPreset}
            />
          </NavigationContainer>
        </View>
      </AuthProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}