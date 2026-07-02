import React, { useState } from "react";
import {
  Image,
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
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../context/AuthContext";

// Assets:
// Si tus logos están en otra carpeta, solo cambiá estas dos rutas.
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");

// Colores fijos de marca para Login:
// Esta pantalla siempre mantiene identidad verde, aunque el usuario cambie el color de la app.
const BRAND = {
  light: {
    primary: "#1F7A4D",
    onPrimary: "#FFFFFF",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceSoft: "#EEF8F2",
    text: "#0F172A",
    muted: "#64748B",
    outline: "#D6DEE8",
    shadow: "rgba(15, 23, 42, 0.10)",
  },
  dark: {
    primary: "#7CFF9B",
    onPrimary: "#07130B",
    background: "#070A0F",
    surface: "#10151F",
    surfaceSoft: "#17251E",
    text: "#F8FAFC",
    muted: "#A7B0C2",
    outline: "#263244",
    shadow: "rgba(0, 0, 0, 0.35)",
  },
};

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { login, authLoading } = useAuth();

  const isDark = theme.dark;
  const brand = isDark ? BRAND.dark : BRAND.light;
  const logo = isDark ? logoDark : logoLight;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [secureText, setSecureText] = useState(true);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    const response = await login({
      email,
      password,
    });

    if (!response.ok) {
      setError(response.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: brand.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
      >
        <View style={styles.brandBox}>
          <View
            style={[
              styles.logoShell,
              {
                backgroundColor: brand.surface,
                borderColor: brand.outline,
                shadowColor: brand.shadow,
              },
            ]}
          >
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <Text
            variant="headlineLarge"
            style={[styles.title, { color: brand.text }]}
          >
            Forte
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: brand.muted }]}
          >
            Entrená. Registrá. Evolucioná.
          </Text>
        </View>

        <Card
          mode="contained"
          style={[
            styles.card,
            {
              backgroundColor: brand.surface,
              borderColor: brand.outline,
              shadowColor: brand.shadow,
            },
          ]}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View>
                <Text
                  variant="titleLarge"
                  style={[styles.cardTitle, { color: brand.text }]}
                >
                  Iniciar sesión
                </Text>

                <Text
                  variant="bodySmall"
                  style={[styles.cardSubtitle, { color: brand.muted }]}
                >
                  Accedé a tu progreso y entrenamientos.
                </Text>
              </View>

              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: brand.surfaceSoft },
                ]}
              >
                <Text
                  variant="labelLarge"
                  style={{ color: brand.primary, fontWeight: "900" }}
                >
                  Fit
                </Text>
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              outlineColor={brand.outline}
              activeOutlineColor={brand.primary}
              textColor={brand.text}
              theme={{
                colors: {
                  primary: brand.primary,
                  onSurfaceVariant: brand.muted,
                  background: brand.surface,
                },
              }}
            />

            <TextInput
              mode="outlined"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              style={styles.input}
              outlineColor={brand.outline}
              activeOutlineColor={brand.primary}
              textColor={brand.text}
              theme={{
                colors: {
                  primary: brand.primary,
                  onSurfaceVariant: brand.muted,
                  background: brand.surface,
                },
              }}
              right={
                <TextInput.Icon
                  icon={secureText ? "eye-outline" : "eye-off-outline"}
                  color={brand.muted}
                  onPress={() => setSecureText((prev) => !prev)}
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
              buttonColor={brand.primary}
              textColor={brand.onPrimary}
              style={styles.button}
              contentStyle={styles.buttonContent}
              onPress={handleLogin}
            >
              Entrar
            </Button>

            <Button
              mode="text"
              disabled={authLoading}
              textColor={brand.primary}
              style={styles.linkButton}
              onPress={() => navigation.navigate("Register")}
            >
              Crear cuenta
            </Button>
          </Card.Content>
        </Card>

        <Text
          variant="bodySmall"
          style={[styles.footerText, { color: brand.muted }]}
        >
          Tu entrenamiento, tus marcas y tu evolución en un solo lugar.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 22,
    justifyContent: "center",
  },
  brandBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoShell: {
    width: 118,
    height: 118,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 18,
    elevation: 5,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  logo: {
    width: 82,
    height: 82,
  },
  title: {
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: "900",
  },
  cardSubtitle: {
    marginTop: 3,
  },
  miniBadge: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  input: {
    marginBottom: 14,
  },
  button: {
    marginTop: 8,
    borderRadius: 17,
  },
  buttonContent: {
    height: 52,
  },
  linkButton: {
    marginTop: 8,
  },
  footerText: {
    textAlign: "center",
    marginTop: 18,
    lineHeight: 18,
  },
});