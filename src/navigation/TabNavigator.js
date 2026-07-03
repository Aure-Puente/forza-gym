//Importaciones:
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTheme } from "react-native-paper";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HomeScreen from "../screens/HomeScreen";
import RecordScreen from "../screens/RecordScreen";
import TrainingScreen from "../screens/TrainingScreen";
import SocialScreen from "../screens/SocialScreen";
import ProfileScreen from "../screens/ProfileScreen";

//JS:
const Tab = createBottomTabNavigator();

export default function TabNavigator({
    themeMode,
    setThemeMode,
    colorPreset,
    setColorPreset,
    unreadSocialCount,
    updateUnreadSocialCount,
    clearUnreadSocialCount,
}) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const bottomInset = Math.max(insets.bottom, 12);

    return (
        <Tab.Navigator
            initialRouteName="Inicio"
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,

                tabBarStyle: {
                    height: 72 + bottomInset,
                    paddingTop: 8,
                    paddingBottom: bottomInset,
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.outlineVariant,
                    borderTopWidth: 1,
                    elevation: 10,
                },

                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "700",
                    marginBottom: 2,
                },

                tabBarItemStyle: {
                    paddingTop: 2,
                },

                tabBarBadge:
                    route.name === "Social" && unreadSocialCount > 0
                        ? unreadSocialCount > 99
                            ? "99+"
                            : unreadSocialCount
                        : undefined,

                tabBarBadgeStyle:
                    route.name === "Social"
                        ? {
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.onPrimary,
                            fontSize: 10,
                            fontWeight: "900",
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            lineHeight: 16,
                        }
                        : undefined,

                tabBarIcon: ({ color, size, focused }) => {
                    const iconSize = focused ? size + 1 : size;

                    if (route.name === "Inicio") {
                        return (
                            <Ionicons
                                name={focused ? "home" : "home-outline"}
                                size={iconSize}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Registro") {
                        return (
                            <MaterialCommunityIcons
                                name={focused ? "chart-box" : "chart-box-outline"}
                                size={iconSize}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Entreno") {
                        return (
                            <MaterialCommunityIcons
                                name="dumbbell"
                                size={iconSize}
                                color={color}
                            />
                        );
                    }

                    if (route.name === "Social") {
                        return (
                            <Ionicons
                                name={focused ? "people" : "people-outline"}
                                size={iconSize}
                                color={color}
                            />
                        );
                    }

                    return (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={iconSize}
                            color={color}
                        />
                    );
                },
            })}
        >
            <Tab.Screen name="Inicio" component={HomeScreen} />

            <Tab.Screen name="Registro" component={RecordScreen} />

            <Tab.Screen name="Entreno" component={TrainingScreen} />

            <Tab.Screen name="Social">
                {(props) => (
                    <SocialScreen
                        {...props}
                        unreadSocialCount={unreadSocialCount}
                        updateUnreadSocialCount={updateUnreadSocialCount}
                        clearUnreadSocialCount={clearUnreadSocialCount}
                    />
                )}
            </Tab.Screen>

            <Tab.Screen name="Perfil">
                {(props) => (
                    <ProfileScreen
                        {...props}
                        themeMode={themeMode}
                        setThemeMode={setThemeMode}
                        colorPreset={colorPreset}
                        setColorPreset={setColorPreset}
                    />
                )}
            </Tab.Screen>
        </Tab.Navigator>
    );
}