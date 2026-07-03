//Importaciones:
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

//JS:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");
const BRAND = {
    light: {
        primary: "#1F7A4D",
        primarySoft: "rgba(31, 122, 77, 0.10)",
        background: "#F7F9FB",
        text: "#0F172A",
        muted: "#64748B",
        outlineSoft: "rgba(15, 23, 42, 0.08)",
    },
    dark: {
        primary: "#7CFF9B",
        primarySoft: "rgba(124, 255, 155, 0.13)",
        background: "#030412",
        text: "#F8FAFC",
        muted: "#A7B0C2",
        outlineSoft: "rgba(255, 255, 255, 0.08)",
    },
    };

    export default function SplashScreen() {
    const theme = useTheme();

    const isDark = theme.dark;
    const brand = isDark ? BRAND.dark : BRAND.light;
    const logo = isDark ? logoDark : logoLight;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateAnim = useRef(new Animated.Value(14)).current;
    const scaleAnim = useRef(new Animated.Value(0.94)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const loaderFadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
            toValue: 0,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        Animated.timing(loaderFadeAnim, {
            toValue: 1,
            duration: 520,
            delay: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }),
        ]).start();

        const pulse = Animated.loop(
        Animated.sequence([
            Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            }),
        ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [fadeAnim, translateAnim, scaleAnim, pulseAnim, loaderFadeAnim]);

    return (
        <View style={[styles.screen, { backgroundColor: brand.background }]}>
        <Animated.View
            style={[
            styles.content,
            {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }, { scale: scaleAnim }],
            },
            ]}
        >
            <Animated.View
            style={[
                styles.logoBox,
                {
                transform: [{ scale: pulseAnim }],
                },
            ]}
            >
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            </Animated.View>

            <Text
            variant="titleMedium"
            style={[styles.title, { color: brand.text }]}
            >
            Preparando tu entrenamiento
            </Text>

            <Text
            variant="bodySmall"
            style={[styles.subtitle, { color: brand.muted }]}
            >
            Cargando tus rutinas, marcas y progreso.
            </Text>

            <Animated.View
            style={[
                styles.loaderBox,
                {
                opacity: loaderFadeAnim,
                backgroundColor: brand.primarySoft,
                borderColor: brand.outlineSoft,
                },
            ]}
            >
            <ActivityIndicator animating size="small" color={brand.primary} />

            <Text
                variant="bodySmall"
                style={[styles.loaderText, { color: brand.muted }]}
            >
                Un momento...
            </Text>
            </Animated.View>
        </Animated.View>
        </View>
    );
    }

    const styles = StyleSheet.create({
    screen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    content: {
        width: "100%",
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
        
    },

    logoBox: {
        width: 340,
        height: 198,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },

    logo: {
        width: 330,
        height: 188,
    },

    title: {
        marginTop: -30,
        fontWeight: "900",
        letterSpacing: -0.3,
        textAlign: "center",
    },

    subtitle: {
        marginTop: 6,
        maxWidth: 285,
        textAlign: "center",
        lineHeight: 18,
    },

    loaderBox: {
        marginTop: 20,
        minHeight: 42,
        paddingHorizontal: 16,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    loaderText: {
        marginLeft: 10,
        fontWeight: "700",
    },
});