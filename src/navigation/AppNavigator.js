//Importaciones:
import React, { useCallback, useEffect, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabNavigator from "./TabNavigator";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import WorkoutDayScreen from "../screens/WorkoutDayScreen";
import GoalsScreen from "../screens/GoalsScreen";
import SplashScreen from "../screens/SplashScreen";
import { useAuth } from "../context/AuthContext";

//JS:
const Stack = createNativeStackNavigator();

export default function AppNavigator({
    themeMode,
    setThemeMode,
    colorPreset,
    setColorPreset,
    }) {
    const { loading, isAuthenticated } = useAuth();

    const [showSplash, setShowSplash] = useState(true);
    const [unreadSocialCount, setUnreadSocialCount] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
        setShowSplash(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    const updateUnreadSocialCount = useCallback((count) => {
        const safeCount = Math.max(0, Number(count) || 0);

        setUnreadSocialCount(safeCount);
    }, []);

    const clearUnreadSocialCount = useCallback(() => {
        setUnreadSocialCount(0);
    }, []);

    if (showSplash || loading) {
        return <SplashScreen />;
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