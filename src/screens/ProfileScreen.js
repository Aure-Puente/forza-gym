import React, { useMemo, useState } from "react";
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

  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);

  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayName =
    userProfile?.name || user?.displayName || "Usuario Forte";

  const displayEmail = userProfile?.email || user?.email || "Sin email";

  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  const initial = displayName?.charAt(0)?.toUpperCase() || "F";

  const softPrimary =
    theme.custom?.softPrimary ||
    (theme.dark ? "rgba(37, 99, 235, 0.18)" : "rgba(37, 99, 235, 0.1)");

  const premiumSurface = theme.dark
    ? "rgba(255,255,255,0.045)"
    : "rgba(255,255,255,0.92)";

  const premiumBorder = theme.dark
    ? "rgba(255,255,255,0.09)"
    : "rgba(15,23,42,0.08)";

  const mutedSurface = theme.dark
    ? "rgba(255,255,255,0.055)"
    : "rgba(15,23,42,0.035)";

  const dangerSoft = theme.dark
    ? "rgba(248,113,113,0.12)"
    : "rgba(220,38,38,0.07)";

  const dangerColor = theme.dark ? "#FCA5A5" : "#B91C1C";

  const appearanceOptions = useMemo(
    () => [
      {
        value: "system",
        label: "Auto",
        description: "Según el celular",
        icon: "theme-light-dark",
      },
      {
        value: "light",
        label: "Claro",
        description: "Limpio y minimal",
        icon: "white-balance-sunny",
      },
      {
        value: "dark",
        label: "Oscuro",
        description: "Modo nocturno",
        icon: "weather-night",
      },
    ],
    []
  );

  const openPhotoDialog = () => {
    if (uploadingPhoto) return;
    setPhotoDialogVisible(true);
  };

  const closePhotoDialog = () => {
    if (uploadingPhoto) return;
    setPhotoDialogVisible(false);
  };

  const uploadSelectedImage = async (imageUri) => {
    if (!user?.uid || !imageUri) return;

    setUploadingPhoto(true);

    await uploadProfilePhoto({
      uid: user.uid,
      imageUri,
    });

    await refreshUserProfile();
  };

  const handleTakePhoto = async () => {
    try {
      if (!user?.uid) return;

      const permission = await ImagePicker.requestCameraPermissionsAsync();

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

      await uploadSelectedImage(imageUri);

      setPhotoDialogVisible(false);

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
  };

  const handleChooseFromGallery = async () => {
    try {
      if (!user?.uid) return;

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

      await uploadSelectedImage(imageUri);

      setPhotoDialogVisible(false);

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
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topHeader}>
        <View>
          <View
            style={[
              styles.eyebrowPill,
              {
                backgroundColor: softPrimary,
                borderColor: premiumBorder,
              },
            ]}
          >
            <IconButton
              icon="dumbbell"
              size={15}
              iconColor={theme.colors.primary}
              style={styles.eyebrowIcon}
            />

            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.primary,
                fontWeight: "900",
                letterSpacing: 0.7,
              }}
            >
              FORTE PROFILE
            </Text>
          </View>

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
            Ajustá tu cuenta, apariencia y estilo visual.
          </Text>
        </View>
      </View>

      <Card
        mode="contained"
        style={[
          styles.profileCard,
          {
            backgroundColor: premiumSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        <Card.Content style={styles.profileCardContent}>
          <View style={styles.profileHeader}>
            <TouchableRipple
              borderless
              onPress={openPhotoDialog}
              disabled={uploadingPhoto}
              style={styles.avatarTouchable}
            >
              <View
                style={[
                  styles.avatarRing,
                  {
                    borderColor: theme.colors.primary,
                    backgroundColor: softPrimary,
                  },
                ]}
              >
                {photoURL ? (
                  <Avatar.Image size={86} source={{ uri: photoURL }} />
                ) : (
                  <Avatar.Text
                    size={86}
                    label={initial}
                    style={{ backgroundColor: "transparent" }}
                    color={theme.colors.primary}
                    labelStyle={{ fontWeight: "900" }}
                  />
                )}

                <View
                  style={[
                    styles.cameraBadge,
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.surface,
                    },
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
              <View
                style={[
                  styles.memberPill,
                  {
                    backgroundColor: mutedSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <IconButton
                  icon="lightning-bolt"
                  size={13}
                  iconColor={theme.colors.primary}
                  style={styles.memberIcon}
                />

                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontWeight: "800",
                  }}
                >
                  Forte Member
                </Text>
              </View>

              <View style={styles.nameRow}>
                <Text
                  variant="titleLarge"
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    letterSpacing: -0.3,
                  }}
                >
                  {displayName}
                </Text>

                <IconButton
                  icon="pencil-outline"
                  size={21}
                  iconColor={theme.colors.primary}
                  onPress={openEditName}
                  style={[
                    styles.editNameButton,
                    {
                      backgroundColor: softPrimary,
                    },
                  ]}
                />
              </View>

              <Text
                variant="bodyMedium"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 2,
                }}
              >
                {displayEmail}
              </Text>

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 10,
                }}
              >
                Tocá la foto para actualizar tu imagen.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card
        mode="contained"
        style={[
          styles.card,
          {
            backgroundColor: premiumSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.sectionHeader}>
            <View>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Apariencia
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Elegí cómo querés ver Forte.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIconBox,
                {
                  backgroundColor: softPrimary,
                },
              ]}
            >
              <IconButton
                icon="palette-outline"
                size={18}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
            </View>
          </View>

          <View style={styles.appearanceGrid}>
            {appearanceOptions.map((option) => {
              const selected = themeMode === option.value;

              return (
                <TouchableRipple
                  key={option.value}
                  borderless
                  onPress={() => setThemeMode(option.value)}
                  style={[
                    styles.appearanceChip,
                    {
                      borderColor: selected
                        ? theme.colors.primary
                        : premiumBorder,
                      backgroundColor: selected ? softPrimary : mutedSurface,
                    },
                  ]}
                >
                  <View style={styles.appearanceChipContent}>
                    <View
                      style={[
                        styles.appearanceIconCircle,
                        {
                          backgroundColor: selected
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: selected
                            ? theme.colors.primary
                            : premiumBorder,
                        },
                      ]}
                    >
                      <IconButton
                        icon={option.icon}
                        size={18}
                        iconColor={
                          selected
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                        style={styles.appearanceIcon}
                      />
                    </View>

                    <View style={styles.appearanceTextBox}>
                      <Text
                        variant="labelLarge"
                        numberOfLines={1}
                        style={{
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.onSurface,
                          fontWeight: "900",
                        }}
                      >
                        {option.label}
                      </Text>

                      <Text
                        variant="bodySmall"
                        numberOfLines={1}
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 1,
                        }}
                      >
                        {option.description}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.selectedDot,
                          {
                            backgroundColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <IconButton
                          icon="check"
                          size={12}
                          iconColor={theme.colors.onPrimary}
                          style={styles.selectedCheck}
                        />
                      </View>
                    )}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      <Card
        mode="contained"
        style={[
          styles.card,
          {
            backgroundColor: premiumSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.sectionHeader}>
            <View>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Color principal
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Personalizá el acento de la app.
              </Text>
            </View>

            <View
              style={[
                styles.sectionIconBox,
                {
                  backgroundColor: softPrimary,
                },
              ]}
            >
              <IconButton
                icon="format-color-fill"
                size={18}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
            </View>
          </View>

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
                        : premiumBorder,
                      backgroundColor: selected
                        ? currentPalette.softPrimary
                        : mutedSurface,
                    },
                  ]}
                >
                  <View style={styles.colorOptionContent}>
                    <View
                      style={[
                        styles.colorDotOuter,
                        {
                          borderColor: currentPalette.primary,
                          backgroundColor: selected
                            ? currentPalette.softPrimary
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: currentPalette.primary },
                        ]}
                      />
                    </View>

                    <View style={styles.colorTextBox}>
                      <Text
                        variant="labelLarge"
                        numberOfLines={1}
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "900",
                        }}
                      >
                        {preset.name}
                      </Text>

                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {selected ? "Color activo" : "Disponible"}
                      </Text>
                    </View>

                    {selected && (
                      <View
                        style={[
                          styles.colorActiveBadge,
                          {
                            backgroundColor: currentPalette.primary,
                          },
                        ]}
                      >
                        <IconButton
                          icon="check"
                          size={13}
                          iconColor={theme.colors.onPrimary}
                          style={styles.colorActiveIcon}
                        />
                      </View>
                    )}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      <TouchableRipple
        borderless
        onPress={logout}
        style={[
          styles.logoutTouchable,
          {
            borderColor: theme.dark
              ? "rgba(248,113,113,0.28)"
              : "rgba(220,38,38,0.18)",
            backgroundColor: theme.dark
              ? "rgba(248,113,113,0.08)"
              : "rgba(220,38,38,0.055)",
          },
        ]}
      >
        <View style={styles.logoutContent}>
          <View>
            <Text
              variant="labelLarge"
              style={{
                color: dangerColor,
                fontWeight: "900",
              }}
            >
              Cerrar sesión
            </Text>

            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              Salir de tu cuenta Forte.
            </Text>
          </View>

          <IconButton
            icon="logout"
            size={22}
            iconColor={dangerColor}
            style={styles.logoutIcon}
          />
        </View>
      </TouchableRipple>

      <Portal>
        <Dialog
          visible={photoDialogVisible}
          onDismiss={closePhotoDialog}
          style={[
            styles.premiumDialog,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.dialogTopContent}>
            <View
              style={[
                styles.dialogHeaderIcon,
                {
                  backgroundColor: softPrimary,
                },
              ]}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size={24} color={theme.colors.primary} />
              ) : (
                <IconButton
                  icon="camera-outline"
                  size={25}
                  iconColor={theme.colors.primary}
                  style={styles.dialogHeaderIconButton}
                />
              )}
            </View>

            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
                textAlign: "center",
                letterSpacing: -0.3,
              }}
            >
              Foto de perfil
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              Elegí cómo querés actualizar tu imagen en Forte.
            </Text>
          </View>

          <View style={styles.photoOptions}>
            <TouchableRipple
              borderless
              disabled={uploadingPhoto}
              onPress={handleTakePhoto}
              style={[
                styles.photoOption,
                {
                  backgroundColor: mutedSurface,
                  borderColor: premiumBorder,
                  opacity: uploadingPhoto ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.photoOptionContent}>
                <View
                  style={[
                    styles.photoOptionIconBox,
                    {
                      backgroundColor: softPrimary,
                    },
                  ]}
                >
                  <IconButton
                    icon="camera"
                    size={21}
                    iconColor={theme.colors.primary}
                    style={styles.photoOptionIcon}
                  />
                </View>

                <View style={styles.photoOptionTextBox}>
                  <Text
                    variant="labelLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                    }}
                  >
                    Sacar foto
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    Usar la cámara del celular
                  </Text>
                </View>

                <IconButton
                  icon="chevron-right"
                  size={22}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.photoOptionArrow}
                />
              </View>
            </TouchableRipple>

            <TouchableRipple
              borderless
              disabled={uploadingPhoto}
              onPress={handleChooseFromGallery}
              style={[
                styles.photoOption,
                {
                  backgroundColor: mutedSurface,
                  borderColor: premiumBorder,
                  opacity: uploadingPhoto ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.photoOptionContent}>
                <View
                  style={[
                    styles.photoOptionIconBox,
                    {
                      backgroundColor: softPrimary,
                    },
                  ]}
                >
                  <IconButton
                    icon="image-outline"
                    size={21}
                    iconColor={theme.colors.primary}
                    style={styles.photoOptionIcon}
                  />
                </View>

                <View style={styles.photoOptionTextBox}>
                  <Text
                    variant="labelLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                    }}
                  >
                    Elegir de galería
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    Seleccionar una imagen existente
                  </Text>
                </View>

                <IconButton
                  icon="chevron-right"
                  size={22}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.photoOptionArrow}
                />
              </View>
            </TouchableRipple>
          </View>

          <View style={styles.dialogActionsCustom}>
            <Button
              mode="outlined"
              disabled={uploadingPhoto}
              onPress={closePhotoDialog}
              style={[
                styles.dialogActionButton,
                {
                  borderColor: premiumBorder,
                },
              ]}
              contentStyle={styles.dialogActionContent}
            >
              Cancelar
            </Button>
          </View>
        </Dialog>

        <Dialog
          visible={editingName}
          onDismiss={closeEditName}
          style={[
            styles.premiumDialog,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.dialogTopContent}>
            <View
              style={[
                styles.dialogHeaderIcon,
                {
                  backgroundColor: softPrimary,
                },
              ]}
            >
              <IconButton
                icon="pencil-outline"
                size={25}
                iconColor={theme.colors.primary}
                style={styles.dialogHeaderIconButton}
              />
            </View>

            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
                textAlign: "center",
                letterSpacing: -0.3,
              }}
            >
              Editar nombre
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: "center",
                marginTop: 6,
                lineHeight: 20,
              }}
            >
              Este nombre se mostrará en tu perfil.
            </Text>
          </View>

          <View style={styles.nameDialogContent}>
            <TextInput
              mode="outlined"
              label="Nombre"
              value={nameValue}
              onChangeText={setNameValue}
              autoCapitalize="words"
              outlineStyle={{ borderRadius: 16 }}
            />
          </View>

          <View style={styles.dialogActionsCustom}>
            <Button
              mode="outlined"
              disabled={savingName}
              onPress={closeEditName}
              style={[
                styles.dialogActionButton,
                {
                  borderColor: premiumBorder,
                },
              ]}
              contentStyle={styles.dialogActionContent}
            >
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={savingName}
              disabled={savingName}
              onPress={handleSaveName}
              style={styles.dialogActionButton}
              contentStyle={styles.dialogActionContent}
            >
              Guardar
            </Button>
          </View>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 58,
    paddingBottom: 120,
  },

  topHeader: {
    marginBottom: 20,
  },

  eyebrowPill: {
    alignSelf: "flex-start",
    minHeight: 30,
    paddingRight: 12,
    paddingLeft: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  eyebrowIcon: {
    width: 26,
    height: 26,
    margin: 0,
  },

  title: {
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 5,
    lineHeight: 20,
  },

  profileCard: {
    borderRadius: 32,
    marginBottom: 16,
    borderWidth: 1,
  },

  profileCardContent: {
    paddingVertical: 20,
  },

  card: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarTouchable: {
    borderRadius: 999,
    marginRight: 16,
  },

  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 31,
    height: 31,
    borderRadius: 15.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },

  cameraIcon: {
    margin: 0,
  },

  profileTextBox: {
    flex: 1,
  },

  memberPill: {
    alignSelf: "flex-start",
    height: 28,
    paddingRight: 10,
    paddingLeft: 2,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  memberIcon: {
    width: 24,
    height: 24,
    margin: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  editNameButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 0,
    marginLeft: 6,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  sectionTitle: {
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionIcon: {
    margin: 0,
  },

  appearanceGrid: {
    gap: 10,
  },

  appearanceChip: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  appearanceChipContent: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  appearanceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  appearanceIcon: {
    margin: 0,
  },

  appearanceTextBox: {
    flex: 1,
  },

  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  selectedCheck: {
    margin: 0,
  },

  colorGrid: {
    gap: 10,
  },

  colorOption: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  colorOptionContent: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  colorDotOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  colorTextBox: {
    flex: 1,
  },

  colorActiveBadge: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  colorActiveIcon: {
    margin: 0,
  },

  logoutTouchable: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 4,
  },

  logoutContent: {
    minHeight: 66,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoutIcon: {
    margin: 0,
  },

  premiumDialog: {
    borderRadius: 30,
    overflow: "hidden",
    marginHorizontal: 18,
  },

  dialogTopContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 14,
    alignItems: "center",
  },

  dialogHeaderIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  dialogHeaderIconButton: {
    margin: 0,
  },

  photoOptions: {
    paddingHorizontal: 24,
    gap: 10,
  },

  photoOption: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  photoOptionContent: {
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  photoOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  photoOptionIcon: {
    margin: 0,
  },

  photoOptionTextBox: {
    flex: 1,
  },

  photoOptionArrow: {
    margin: 0,
  },

  nameDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },

  dialogActionsCustom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },

  dialogActionButton: {
    flex: 1,
    borderRadius: 16,
  },

  dialogActionContent: {
    height: 48,
  },
});