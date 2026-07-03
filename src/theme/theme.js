//Tema:
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const COLOR_PRESETS = {
    green: {
        id: "green",
        name: "Verde Fit",
        light: {
        primary: "#1F7A4D",
        onPrimary: "#FFFFFF",
        secondary: "#0F172A",
        tertiary: "#B9FF38",
        background: "#F5F7FA",
        surface: "#FFFFFF",
        surfaceVariant: "#EEF2F6",
        onSurfaceVariant: "#64748B",
        outline: "#D6DEE8",
        outlineVariant: "#E5EAF0",
        softPrimary: "rgba(31, 122, 77, 0.12)",
        softTertiary: "rgba(185, 255, 56, 0.20)",
        },
        dark: {
        primary: "#7CFF9B",
        onPrimary: "#07130B",
        secondary: "#E5E7EB",
        tertiary: "#B9FF38",
        background: "#070A0F",
        surface: "#10151F",
        surfaceVariant: "#181D24",
        onSurfaceVariant: "#A7B0C2",
        outline: "#2A303A",
        outlineVariant: "#1E2630",
        softPrimary: "rgba(124, 255, 155, 0.10)",
        softTertiary: "rgba(185, 255, 56, 0.08)",
        },
    },

    blue: {
        id: "blue",
        name: "Azul Tech",
        light: {
        primary: "#2563EB",
        onPrimary: "#FFFFFF",
        secondary: "#0F172A",
        tertiary: "#38BDF8",
        background: "#F6F8FC",
        surface: "#FFFFFF",
        surfaceVariant: "#EEF4FF",
        onSurfaceVariant: "#64748B",
        outline: "#D8E2F2",
        outlineVariant: "#E5ECF7",
        softPrimary: "rgba(37, 99, 235, 0.12)",
        softTertiary: "rgba(56, 189, 248, 0.18)",
        },
        dark: {
        primary: "#60A5FA",
        onPrimary: "#06111F",
        secondary: "#E5E7EB",
        tertiary: "#38BDF8",
        background: "#070A0F",
        surface: "#10151F",
        surfaceVariant: "#181D24",
        onSurfaceVariant: "#A7B0C2",
        outline: "#2A303A",
        outlineVariant: "#1E2630",
        softPrimary: "rgba(96, 165, 250, 0.10)",
        softTertiary: "rgba(56, 189, 248, 0.08)",
        },
    },

    orange: {
        id: "orange",
        name: "Naranja Power",
        light: {
        primary: "#EA580C",
        onPrimary: "#FFFFFF",
        secondary: "#111827",
        tertiary: "#FDBA74",
        background: "#FAF7F2",
        surface: "#FFFFFF",
        surfaceVariant: "#FFF1E7",
        onSurfaceVariant: "#6B7280",
        outline: "#E7D8C9",
        outlineVariant: "#F0E5DA",
        softPrimary: "rgba(234, 88, 12, 0.12)",
        softTertiary: "rgba(253, 186, 116, 0.22)",
        },
        dark: {
        primary: "#FB923C",
        onPrimary: "#1C0B02",
        secondary: "#F3F4F6",
        tertiary: "#FDBA74",
        background: "#070A0F",
        surface: "#10151F",
        surfaceVariant: "#181D24",
        onSurfaceVariant: "#A7B0C2",
        outline: "#2A303A",
        outlineVariant: "#1E2630",
        softPrimary: "rgba(251, 146, 60, 0.10)",
        softTertiary: "rgba(253, 186, 116, 0.08)",
        },
    },

    black: {
        id: "black",
        name: "Negro Elite",
        light: {
        primary: "#111827",
        onPrimary: "#FFFFFF",
        secondary: "#374151",
        tertiary: "#6B7280",
        background: "#F5F5F5",
        surface: "#FFFFFF",
        surfaceVariant: "#F0F0F0",
        onSurfaceVariant: "#6B7280",
        outline: "#D4D4D4",
        outlineVariant: "#E5E5E5",
        softPrimary: "rgba(17, 24, 39, 0.10)",
        softTertiary: "rgba(107, 114, 128, 0.14)",
        },
        dark: {
        primary: "#F8FAFC",
        onPrimary: "#050505",
        secondary: "#E5E7EB",
        tertiary: "#A3A3A3",
        background: "#000000",
        surface: "#0B0B0B",
        surfaceVariant: "#171717",
        onSurfaceVariant: "#A3A3A3",
        outline: "#2A2A2A",
        outlineVariant: "#1F1F1F",
        softPrimary: "rgba(248, 250, 252, 0.10)",
        softTertiary: "rgba(163, 163, 163, 0.10)",
        },
    },

    purple: {
        id: "purple",
        name: "Violeta Premium",
        light: {
        primary: "#7C3AED",
        onPrimary: "#FFFFFF",
        secondary: "#111827",
        tertiary: "#C084FC",
        background: "#F8F6FC",
        surface: "#FFFFFF",
        surfaceVariant: "#F1EAFE",
        onSurfaceVariant: "#64748B",
        outline: "#DED3F2",
        outlineVariant: "#EAE1F8",
        softPrimary: "rgba(124, 58, 237, 0.12)",
        softTertiary: "rgba(192, 132, 252, 0.20)",
        },
        dark: {
        primary: "#A78BFA",
        onPrimary: "#120722",
        secondary: "#F3F4F6",
        tertiary: "#C084FC",
        background: "#070A0F",
        surface: "#10151F",
        surfaceVariant: "#181D24",
        onSurfaceVariant: "#A7B0C2",
        outline: "#2A303A",
        outlineVariant: "#1E2630",
        softPrimary: "rgba(167, 139, 250, 0.10)",
        softTertiary: "rgba(192, 132, 252, 0.08)",
        },
    },

    red: {
        id: "red",
        name: "Rojo Titan",
        light: {
        primary: "#DC2626",
        onPrimary: "#FFFFFF",
        secondary: "#111827",
        tertiary: "#FB7185",
        background: "#FAF5F5",
        surface: "#FFFFFF",
        surfaceVariant: "#FEECEC",
        onSurfaceVariant: "#6B7280",
        outline: "#E8D1D1",
        outlineVariant: "#F1DFDF",
        softPrimary: "rgba(220, 38, 38, 0.12)",
        softTertiary: "rgba(251, 113, 133, 0.18)",
        },
        dark: {
        primary: "#F87171",
        onPrimary: "#1F0505",
        secondary: "#F3F4F6",
        tertiary: "#FB7185",
        background: "#070A0F",
        surface: "#10151F",
        surfaceVariant: "#181D24",
        onSurfaceVariant: "#A7B0C2",
        outline: "#2A303A",
        outlineVariant: "#1E2630",
        softPrimary: "rgba(248, 113, 113, 0.10)",
        softTertiary: "rgba(251, 113, 133, 0.08)",
        },
    },
};

const createLiftLogTheme = ({ mode = "light", colorPreset = "green" }) => {
    const isDark = mode === "dark";
    const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

    const preset = COLOR_PRESETS[colorPreset] || COLOR_PRESETS.green;
    const palette = isDark ? preset.dark : preset.light;

    return {
        ...baseTheme,
        dark: isDark,
        roundness: 18,
        colors: {
        ...baseTheme.colors,

        primary: palette.primary,
        onPrimary: palette.onPrimary,

        secondary: palette.secondary,
        onSecondary: isDark ? "#111827" : "#FFFFFF",

        tertiary: palette.tertiary,
        onTertiary: "#111827",

        background: palette.background,
        onBackground: isDark ? "#F8FAFC" : "#111827",

        surface: palette.surface,
        onSurface: isDark ? "#F8FAFC" : "#111827",

        surfaceVariant: palette.surfaceVariant,
        onSurfaceVariant: palette.onSurfaceVariant,

        outline: palette.outline,
        outlineVariant: palette.outlineVariant,

        error: isDark ? "#F87171" : "#DC2626",
        onError: isDark ? "#111827" : "#FFFFFF",

        elevation: {
            level0: "transparent",
            level1: palette.surface,
            level2: isDark ? palette.surfaceVariant : "#F8FAFC",
            level3: isDark ? palette.surfaceVariant : "#F1F5F9",
            level4: isDark ? palette.outlineVariant : "#E2E8F0",
            level5: isDark ? palette.outline : "#CBD5E1",
        },
        },
        custom: {
        presetId: preset.id,
        presetName: preset.name,

        success: isDark ? "#7CFF9B" : "#16A34A",
        warning: isDark ? "#FDE047" : "#B7791F",
        info: isDark ? "#60A5FA" : "#2563EB",
        muted: palette.onSurfaceVariant,

        cardBorder: isDark
            ? "rgba(148, 163, 184, 0.14)"
            : "rgba(15, 23, 42, 0.08)",

        softPrimary: palette.softPrimary,
        softTertiary: palette.softTertiary,

        shadow: isDark
            ? "rgba(0, 0, 0, 0.32)"
            : "rgba(15, 23, 42, 0.08)",
        },
    };
};

export const getLiftLogTheme = ({
    themeMode,
    colorPreset,
    systemColorScheme,
}) => {
    const isDark =
        themeMode === "dark" ||
        (themeMode === "system" && systemColorScheme === "dark");

    return createLiftLogTheme({
        mode: isDark ? "dark" : "light",
        colorPreset,
    });
};

export const lightTheme = createLiftLogTheme({
    mode: "light",
    colorPreset: "green",
});

export const darkTheme = createLiftLogTheme({
    mode: "dark",
    colorPreset: "green",
});