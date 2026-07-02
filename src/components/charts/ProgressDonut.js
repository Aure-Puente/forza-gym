//Importaciones:
import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Text, useTheme } from "react-native-paper";

//JS:
export default function ProgressDonut({
  progress = 0,
  size = 132,
  strokeWidth = 13,
  label = "0%",
  subLabel = "Completado",
}) {
  const theme = useTheme();

  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (safeProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          stroke={theme.colors.surfaceVariant}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        <Circle
          stroke={theme.colors.primary}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      <View style={styles.centerContent}>
        <Text
          variant="headlineSmall"
          style={{ color: theme.colors.onSurface, fontWeight: "900" }}
        >
          {label}
        </Text>

        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
        >
          {subLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});