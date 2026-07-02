import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, useTheme } from "react-native-paper";

export default function GoalsScreen({ navigation }) {
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />

        <View style={styles.headerText}>
          <Text
            variant="headlineSmall"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Objetivos
          </Text>

          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Metas personales de entrenamiento
          </Text>
        </View>
      </View>

      <Card
        mode="contained"
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Card.Content>
          <Text
            variant="titleLarge"
            style={{ color: theme.colors.onSurface, fontWeight: "800" }}
          >
            Primer objetivo
          </Text>

          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          >
            Ejemplo: llegar a 80 kg en sentadilla.
          </Text>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon="plus"
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Crear objetivo
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: "900",
  },
  card: {
    borderRadius: 28,
    marginBottom: 18,
  },
  button: {
    borderRadius: 18,
  },
  buttonContent: {
    height: 50,
  },
});