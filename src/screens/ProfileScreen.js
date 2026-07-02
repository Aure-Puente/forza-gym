import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";

import { COLOR_PRESETS } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import {
  updateUserName,
  uploadProfilePhoto,
} from "../services/profileService";

export default function ProfileScreen({
  themeMode,
  setThemeMode,
  colorPreset,
  setColorPreset,
}) {
  const theme = useTheme();
  const { user, userProfile, logout, refreshUserProfile } = useAuth();

  const presets = Object.values(COLOR_PRESETS);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(
    userProfile?.name || user?.displayName || ""
  );

  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayName =
    userProfile?.name || user?.displayName || "Usuario Forte";

  const displayEmail = userProfile?.email || user?.email || "Sin email";

  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  const initial = displayName?.charAt(0)?.toUpperCase() || "F";

const handlePickProfilePhoto = async () => {
  try {
    if (!user?.uid) return;

    Alert.alert(
      "Foto de perfil",
      "Elegí cómo querés cargar tu foto.",
      [
        {
          text: "Cámara",
          onPress: async () => {
            try {
              const permission =
                await ImagePicker.requestCameraPermissionsAsync();

              if (!permission.granted) {
                Alert.alert(
                  "Permiso necesario",
                  "Necesitamos acceso a la cámara para sacar una foto de perfil."
                );
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (result.canceled) return;

              const imageUri = result.assets?.[0]?.uri;

              if (!imageUri) return;

              setUploadingPhoto(true);

              await uploadProfilePhoto({
                uid: user.uid,
                imageUri,
              });

              await refreshUserProfile();

              Alert.alert(
                "Foto actualizada",
                "Tu foto de perfil se guardó correctamente."
              );
            } catch (error) {
              Alert.alert(
                "Error",
                error?.message || "No se pudo sacar la foto."
              );
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
        {
          text: "Galería",
          onPress: async () => {
            try {
              const permission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

              if (!permission.granted) {
                Alert.alert(
                  "Permiso necesario",
                  "Necesitamos acceso a tu galería para elegir una foto de perfil."
                );
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (result.canceled) return;

              const imageUri = result.assets?.[0]?.uri;

              if (!imageUri) return;

              setUploadingPhoto(true);

              await uploadProfilePhoto({
                uid: user.uid,
                imageUri,
              });

              await refreshUserProfile();

              Alert.alert(
                "Foto actualizada",
                "Tu foto de perfil se guardó correctamente."
              );
            } catch (error) {
              Alert.alert(
                "Error",
                error?.message || "No se pudo elegir la foto."
              );
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ]
    );
  } catch (error) {
    Alert.alert(
      "Error",
      error?.message || "No se pudo actualizar la foto de perfil."
    );
  }
};

  const openEditName = () => {
    setNameValue(displayName);
    setEditingName(true);
  };

  const closeEditName = () => {
    if (savingName) return;
    setEditingName(false);
  };

  const handleSaveName = async () => {
    try {
      if (!user?.uid) return;

      if (!nameValue.trim()) {
        Alert.alert("Nombre inválido", "Ingresá un nombre válido.");
        return;
      }

      setSavingName(true);

      await updateUserName({
        uid: user.uid,
        name: nameValue,
      });

      await refreshUserProfile();

      setEditingName(false);
    } catch (error) {
      Alert.alert(
        "Error",
        error?.message || "No se pudo actualizar el nombre."
      );
    } finally {
      setSavingName(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: theme.colors.onBackground }]}
      >
        Perfil
      </Text>

      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Configuración de cuenta y preferencias.
      </Text>

      <Card
        mode="contained"
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Card.Content>
          <View style={styles.profileHeader}>
            <TouchableRipple
              borderless
              onPress={handlePickProfilePhoto}
              disabled={uploadingPhoto}
              style={styles.avatarTouchable}
            >
              <View>
                {photoURL ? (
                  <Avatar.Image size={82} source={{ uri: photoURL }} />
                ) : (
                  <Avatar.Text
                    size={82}
                    label={initial}
                    style={{ backgroundColor: theme.custom.softPrimary }}
                    color={theme.colors.primary}
                  />
                )}

                <View
                  style={[
                    styles.cameraBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  {uploadingPhoto ? (
                    <ActivityIndicator
                      size={14}
                      color={theme.colors.onPrimary}
                    />
                  ) : (
                    <IconButton
                      icon="camera-outline"
                      size={15}
                      iconColor={theme.colors.onPrimary}
                      style={styles.cameraIcon}
                    />
                  )}
                </View>
              </View>
            </TouchableRipple>

            <View style={styles.profileTextBox}>
              <View style={styles.nameRow}>
                <Text
                  variant="titleLarge"
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                  }}
                >
                  {displayName}
                </Text>

                <IconButton
                  icon="pencil-outline"
                  size={21}
                  onPress={openEditName}
                  style={styles.editNameButton}
                />
              </View>

              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 3 }}
              >
                {displayEmail}
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 10 }}
              >
                Tocá la foto para cambiarla.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card
        mode="contained"
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Card.Content>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Apariencia
          </Text>

          <SegmentedButtons
            value={themeMode}
            onValueChange={setThemeMode}
            buttons={[
              {
                value: "system",
                label: "Auto",
                icon: "theme-light-dark",
              },
              {
                value: "light",
                label: "Claro",
                icon: "white-balance-sunny",
              },
              {
                value: "dark",
                label: "Oscuro",
                icon: "weather-night",
              },
            ]}
          />
        </Card.Content>
      </Card>

      <Card
        mode="contained"
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Card.Content>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Color principal
          </Text>

          <View style={styles.colorGrid}>
            {presets.map((preset) => {
              const selected = colorPreset === preset.id;
              const currentPalette = theme.dark ? preset.dark : preset.light;

              return (
                <TouchableRipple
                  key={preset.id}
                  borderless
                  onPress={() => setColorPreset(preset.id)}
                  style={[
                    styles.colorOption,
                    {
                      borderColor: selected
                        ? currentPalette.primary
                        : theme.colors.outlineVariant,
                      backgroundColor: selected
                        ? currentPalette.softPrimary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <View style={styles.colorOptionContent}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: currentPalette.primary },
                      ]}
                    />

                    <View style={styles.colorTextBox}>
                      <Text
                        variant="labelLarge"
                        numberOfLines={1}
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "800",
                        }}
                      >
                        {preset.name}
                      </Text>

                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {selected ? "Activo" : "Disponible"}
                      </Text>
                    </View>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        style={styles.logoutButton}
        contentStyle={styles.buttonContent}
        onPress={logout}
      >
        Cerrar sesión
      </Button>

      <Portal>
        <Dialog
          visible={editingName}
          onDismiss={closeEditName}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>Editar nombre</Dialog.Title>

          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Nombre"
              value={nameValue}
              onChangeText={setNameValue}
              autoCapitalize="words"
            />
          </Dialog.Content>

          <Dialog.Actions>
            <Button disabled={savingName} onPress={closeEditName}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={savingName}
              disabled={savingName}
              onPress={handleSaveName}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 62,
    paddingBottom: 110,
  },
  title: {
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderRadius: 28,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarTouchable: {
    borderRadius: 999,
    marginRight: 16,
  },
  cameraBadge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    margin: 0,
  },
  profileTextBox: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  editNameButton: {
    margin: 0,
    marginLeft: 4,
  },
  sectionTitle: {
    fontWeight: "800",
    marginBottom: 14,
  },
  colorGrid: {
    gap: 10,
  },
  colorOption: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  colorOptionContent: {
    minHeight: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
  },
  colorTextBox: {
    flex: 1,
  },
  logoutButton: {
    borderRadius: 18,
    marginTop: 8,
  },
  buttonContent: {
    height: 50,
  },
});