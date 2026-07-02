//Importaciones:
import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import WorkoutDayScreen from "../screens/WorkoutDayScreen";
import GoalsScreen from "../screens/GoalsScreen";
import { useAuth } from "../context/AuthContext";

//JS:
const Stack = createNativeStackNavigator();

export default function AppNavigator({
    themeMode,
    setThemeMode,
    colorPreset,
    setColorPreset,
    }) {
    const theme = useTheme();
    const { loading, isAuthenticated } = useAuth();

    const [unreadSocialCount, setUnreadSocialCount] = useState(0);

    const updateUnreadSocialCount = useCallback((count) => {
        const safeCount = Math.max(0, Number(count) || 0);

        setUnreadSocialCount(safeCount);
    }, []);

    const clearUnreadSocialCount = useCallback(() => {
        setUnreadSocialCount(0);
    }, []);

    if (loading) {
        return (
        <View
            style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.background },
            ]}
        >
            <ActivityIndicator size="large" />

            <Text
            variant="bodyMedium"
            style={{
                marginTop: 14,
                color: theme.colors.onSurfaceVariant,
            }}
            >
            Cargando Forte...
            </Text>
        </View>
        );
    }

    return (
        <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
        >
        {!isAuthenticated ? (
            <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            </>
        ) : (
            <>
            <Stack.Screen name="MainTabs">
                {(props) => (
                <TabNavigator
                    {...props}
                    themeMode={themeMode}
                    setThemeMode={setThemeMode}
                    colorPreset={colorPreset}
                    setColorPreset={setColorPreset}
                    unreadSocialCount={unreadSocialCount}
                    updateUnreadSocialCount={updateUnreadSocialCount}
                    clearUnreadSocialCount={clearUnreadSocialCount}
                />
                )}
            </Stack.Screen>

            <Stack.Screen name="WorkoutDay" component={WorkoutDayScreen} />
            <Stack.Screen name="Goals" component={GoalsScreen} />
            </>
        )}
        </Stack.Navigator>
    );
    }

    const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
});