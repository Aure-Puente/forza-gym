import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  HelperText,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../context/AuthContext";

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const { register, authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);

  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!name.trim()) {
      setError("Ingresá tu nombre.");
      return;
    }

    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const response = await register({
      name,
      email,
      password,
    });

    if (!response.ok) {
      setError(response.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
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
              Crear cuenta
            </Text>

            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Empezá a registrar tu progreso en Forte.
            </Text>
          </View>
        </View>

        <Card
          mode="contained"
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
        >
          <Card.Content>
            <TextInput
              mode="outlined"
              label="Nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={secureText ? "eye-outline" : "eye-off-outline"}
                  onPress={() => setSecureText((prev) => !prev)}
                />
              }
            />

            <TextInput
              mode="outlined"
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={secureConfirmText}
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={
                    secureConfirmText ? "eye-outline" : "eye-off-outline"
                  }
                  onPress={() => setSecureConfirmText((prev) => !prev)}
                />
              }
            />

            {!!error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              loading={authLoading}
              disabled={authLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              onPress={handleRegister}
            >
              Crear cuenta
            </Button>

            <Button
              mode="text"
              disabled={authLoading}
              style={styles.linkButton}
              onPress={() => navigation.goBack()}
            >
              Ya tengo cuenta
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 54,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  card: {
    borderRadius: 28,
  },
  input: {
    marginBottom: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
  },
  buttonContent: {
    height: 52,
  },
  linkButton: {
    marginTop: 8,
  },
});