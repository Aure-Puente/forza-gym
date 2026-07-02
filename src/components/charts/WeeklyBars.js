//Importaciones:
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

//JS:
export default function WeeklyBars({
  data = [],
  valueKey = "volume",
  maxHeight = 92,
  labelSuffix = "",
}) {
  const theme = useTheme();

  const values = data.map((item) => Number(item[valueKey]) || 0);
  const maxValue = Math.max(...values, 1);

  return (
    <View style={styles.container}>
      <View style={[styles.chartBox, { height: maxHeight + 30 }]}>
        {data.map((item) => {
          const value = Number(item[valueKey]) || 0;
          const percent = value > 0 ? value / maxValue : 0;
          const barHeight = Math.max(8, percent * maxHeight);

          return (
            <View key={item.dateKey || item.label} style={styles.barItem}>
              <View style={[styles.barTrack, { height: maxHeight }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: value > 0 ? barHeight : 8,
                      backgroundColor:
                        value > 0
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                    },
                  ]}
                />
              </View>

              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: "800",
                  marginTop: 8,
                }}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {labelSuffix}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  chartBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barItem: {
    flex: 1,
    alignItems: "center",
  },
  barTrack: {
    width: 18,
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: 18,
    borderRadius: 999,
  },
  legendRow: {
    marginTop: 2,
    alignItems: "center",
  },
});