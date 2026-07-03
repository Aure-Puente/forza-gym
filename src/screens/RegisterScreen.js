//Importaciones:
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

//JS:
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

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const { register, authLoading } = useAuth();

  const isDark = theme.dark;
  const brand = isDark ? BRAND.dark : BRAND.light;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);

  const [error, setError] = useState("");

  const clearErrorOnChange = () => {
    if (error) setError("");
  };

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
      name: name.trim(),
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
                  Crear cuenta
                </Text>

                <Text
                  variant="bodySmall"
                  style={[styles.cardSubtitle, { color: brand.muted }]}
                >
                  Completá tus datos para empezar.
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
                label="Nombre"
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  clearErrorOnChange();
                }}
                autoCapitalize="words"
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
                    icon="account-outline"
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
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  clearErrorOnChange();
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
                  clearErrorOnChange();
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

              <TextInput
                mode="outlined"
                label="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearErrorOnChange();
                }}
                secureTextEntry={secureConfirmText}
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
                    icon="lock-check-outline"
                    color={brand.muted}
                    forceTextInputFocus={false}
                  />
                }
                right={
                  <TextInput.Icon
                    icon={secureConfirmText ? "eye-outline" : "eye-off-outline"}
                    color={brand.muted}
                    onPress={() => setSecureConfirmText((prev) => !prev)}
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

            <View
              style={[
                styles.passwordHint,
                {
                  backgroundColor: brand.primarySoft,
                  borderColor: brand.outlineSoft,
                },
              ]}
            >
              <IconButton
                icon="information-outline"
                size={17}
                iconColor={brand.primary}
                style={styles.passwordHintIcon}
              />

              <Text
                variant="bodySmall"
                style={[styles.passwordHintText, { color: brand.muted }]}
              >
                La contraseña debe tener al menos 6 caracteres.
              </Text>
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
              onPress={handleRegister}
            >
              Crear cuenta
            </Button>

            <View style={styles.loginRow}>
              <Text
                variant="bodySmall"
                style={{
                  color: brand.muted,
                }}
              >
                ¿Ya tenés cuenta?
              </Text>

              <Button
                mode="text"
                compact
                disabled={authLoading}
                textColor={brand.primary}
                labelStyle={styles.loginLabel}
                style={styles.linkButton}
                onPress={() => navigation.goBack()}
              >
                Iniciar sesión
              </Button>
            </View>
          </Card.Content>
        </Card>
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
    paddingTop: 28,
    paddingBottom: 28,
    justifyContent: "center",
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

  passwordHint: {
    borderRadius: 18,
    borderWidth: 1,
    paddingRight: 12,
    paddingVertical: 3,
    marginTop: -2,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  passwordHintIcon: {
    margin: 0,
  },

  passwordHintText: {
    flex: 1,
    lineHeight: 18,
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

  loginRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  linkButton: {
    marginLeft: 2,
  },

  loginLabel: {
    fontWeight: "900",
  },
});