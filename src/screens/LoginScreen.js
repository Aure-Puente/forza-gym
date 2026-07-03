//Importaciones:
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
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";

//JS:
// Assets:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");

const BRAND = {
  light: {
    primary: "#1F7A4D",
    primaryStrong: "#16643D",
    primarySoft: "rgba(31, 122, 77, 0.10)",
    onPrimary: "#FFFFFF",
    background: "#F5F7FA",
    surface: "#FFFFFF",
    surfaceSoft: "#EEF8F2",
    text: "#0F172A",
    muted: "#64748B",
    subtle: "#94A3B8",
    outline: "#D6DEE8",
    outlineSoft: "rgba(15, 23, 42, 0.08)",
    inputBg: "#FFFFFF",
    errorBg: "#FEF2F2",
    errorText: "#B91C1C",
    shadow: "rgba(15, 23, 42, 0.13)",
  },
  dark: {
    primary: "#7CFF9B",
    primaryStrong: "#A7FFBA",
    primarySoft: "rgba(124, 255, 155, 0.13)",
    onPrimary: "#07130B",
    background: "#030412",
    surface: "#151620",
    surfaceSoft: "#173020",
    text: "#F8FAFC",
    muted: "#A7B0C2",
    subtle: "#718096",
    outline: "#263244",
    outlineSoft: "rgba(255, 255, 255, 0.08)",
    inputBg: "#151620",
    errorBg: "rgba(248, 113, 113, 0.12)",
    errorText: "#FCA5A5",
    shadow: "rgba(0, 0, 0, 0.42)",
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

    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresá tu contraseña.");
      return;
    }

    const response = await login({
      email: email.trim(),
      password,
    });

    if (!response.ok) {
      setError(response.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: brand.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.brandBox}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: brand.muted }]}
          >
            Registrá tus rutinas, seguí tus marcas y compartí tu progreso.
          </Text>
        </View>

        <Card
          mode="contained"
          style={[
            styles.card,
            {
              backgroundColor: brand.surface,
              borderColor: brand.outlineSoft,
              shadowColor: brand.shadow,
            },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
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
                  Volvé a tu panel de entrenamiento.
                </Text>
              </View>

              <View
                style={[
                  styles.secureBadge,
                  {
                    backgroundColor: brand.surfaceSoft,
                    borderColor: brand.outlineSoft,
                  },
                ]}
              >
                <IconButton
                  icon="shield-check-outline"
                  size={17}
                  iconColor={brand.primary}
                  style={styles.secureBadgeIcon}
                />
              </View>
            </View>

            <View style={styles.inputsBox}>
              <TextInput
                mode="outlined"
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: brand.inputBg,
                  },
                ]}
                outlineColor={brand.outline}
                activeOutlineColor={brand.primary}
                textColor={brand.text}
                left={
                  <TextInput.Icon
                    icon="email-outline"
                    color={brand.muted}
                    forceTextInputFocus={false}
                  />
                }
                outlineStyle={styles.inputOutline}
                theme={{
                  colors: {
                    primary: brand.primary,
                    onSurfaceVariant: brand.muted,
                    background: brand.inputBg,
                  },
                }}
              />

              <TextInput
                mode="outlined"
                label="Contraseña"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError("");
                }}
                secureTextEntry={secureText}
                style={[
                  styles.input,
                  {
                    backgroundColor: brand.inputBg,
                  },
                ]}
                outlineColor={brand.outline}
                activeOutlineColor={brand.primary}
                textColor={brand.text}
                left={
                  <TextInput.Icon
                    icon="lock-outline"
                    color={brand.muted}
                    forceTextInputFocus={false}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={secureText ? "eye-outline" : "eye-off-outline"}
                    color={brand.muted}
                    onPress={() => setSecureText((prev) => !prev)}
                  />
                }
                outlineStyle={styles.inputOutline}
                theme={{
                  colors: {
                    primary: brand.primary,
                    onSurfaceVariant: brand.muted,
                    background: brand.inputBg,
                  },
                }}
              />
            </View>

            {!!error && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: brand.errorBg,
                    borderColor: isDark
                      ? "rgba(248, 113, 113, 0.18)"
                      : "rgba(185, 28, 28, 0.12)",
                  },
                ]}
              >
                <IconButton
                  icon="alert-circle-outline"
                  size={18}
                  iconColor={brand.errorText}
                  style={styles.errorIcon}
                />

                <HelperText
                  type="error"
                  visible={!!error}
                  style={[styles.errorText, { color: brand.errorText }]}
                >
                  {error}
                </HelperText>
              </View>
            )}

            <Button
              mode="contained"
              loading={authLoading}
              disabled={authLoading}
              buttonColor={brand.primary}
              textColor={brand.onPrimary}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              onPress={handleLogin}
            >
              Entrar
            </Button>

            <View style={styles.registerRow}>
              <Text
                variant="bodySmall"
                style={{
                  color: brand.muted,
                }}
              >
                ¿Todavía no tenés cuenta?
              </Text>

              <Button
                mode="text"
                compact
                disabled={authLoading}
                textColor={brand.primary}
                labelStyle={styles.registerLabel}
                style={styles.linkButton}
                onPress={() => navigation.navigate("Register")}
              >
                Crear cuenta
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View
          style={[
            styles.footerCard,
            {
              backgroundColor: brand.primarySoft,
              borderColor: brand.outlineSoft,
            },
          ]}
        >
          <IconButton
            icon="chart-timeline-variant"
            size={18}
            iconColor={brand.primary}
            style={styles.footerIcon}
          />

          <Text
            variant="bodySmall"
            style={[styles.footerText, { color: brand.muted }]}
          >
            Tus marcas, entrenamientos y progreso en un solo lugar.
          </Text>
        </View>
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
    paddingHorizontal: 22,
    paddingBottom: 28,
    justifyContent: "center",
  },

  brandBox: {
    alignItems: "center",
    marginBottom: 18,
  },

  logo: {
    width: 325,
    height: 200,
    marginBottom: 0,
  },

  subtitle: {
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 285,
    fontSize: 13,
    marginTop: -20,
  },

  card: {
    borderRadius: 28,
    borderWidth: 1,
    elevation: 5,
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },

  cardContent: {
    paddingVertical: 20,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  cardHeaderText: {
    flex: 1,
    marginRight: 12,
  },

  cardTitle: {
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  cardSubtitle: {
    marginTop: 4,
    lineHeight: 18,
  },

  secureBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secureBadgeIcon: {
    margin: 0,
  },

  inputsBox: {
    gap: 2,
  },

  input: {
    marginBottom: 14,
  },

  inputOutline: {
    borderRadius: 18,
  },

  errorBox: {
    borderRadius: 18,
    borderWidth: 1,
    paddingRight: 10,
    marginTop: -2,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  errorIcon: {
    margin: 0,
  },

  errorText: {
    flex: 1,
    paddingLeft: 0,
    paddingRight: 0,
    marginVertical: 0,
  },

  button: {
    marginTop: 4,
    borderRadius: 18,
  },

  buttonContent: {
    height: 50,
  },

  buttonLabel: {
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  registerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  linkButton: {
    marginLeft: 2,
  },

  registerLabel: {
    fontWeight: "900",
  },

  footerCard: {
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  footerIcon: {
    margin: 0,
    marginRight: 4,
  },

  footerText: {
    flex: 1,
    lineHeight: 18,
  },
});