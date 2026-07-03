import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
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

import { useAuth } from "../context/AuthContext";

import {
  createTrainingDay,
  deleteTrainingDay,
  getTrainingDays,
  updateTrainingDay,
} from "../services/trainingDaysService";

export default function TrainingScreen({ navigation }) {
  const theme = useTheme();
  const { user } = useAuth();

  const [days, setDays] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dayName, setDayName] = useState("");
  const [selectedDay, setSelectedDay] = useState(null);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [dayToDelete, setDayToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!selectedDay;

  const sortedDays = useMemo(() => {
    return [...days].sort((a, b) => {
      const orderA = a.order || 0;
      const orderB = b.order || 0;

      return orderA - orderB;
    });
  }, [days]);

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

  const loadDays = useCallback(async () => {
    try {
      setError("");

      if (!user?.uid) return;

      const response = await getTrainingDays(user.uid);

      setDays(response);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los días.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDays();
  };

  const openCreateDialog = () => {
    setSelectedDay(null);
    setDayName("");
    setError("");
    setDialogVisible(true);
  };

  const openEditDialog = (day) => {
    setSelectedDay(day);
    setDayName(day.name || "");
    setError("");
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) return;

    setDialogVisible(false);
    setSelectedDay(null);
    setDayName("");
    setError("");
  };

  const handleSaveDay = async () => {
    try {
      setSaving(true);
      setError("");

      if (!dayName.trim()) {
        setError("Ingresá el nombre del día.");
        return;
      }

      if (isEditing) {
        await updateTrainingDay({
          uid: user.uid,
          dayId: selectedDay.id,
          name: dayName,
        });
      } else {
        await createTrainingDay({
          uid: user.uid,
          name: dayName,
          order: days.length + 1,
        });
      }

      closeDialog();
      await loadDays();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el día.");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (day) => {
    setDayToDelete(day);
    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;

    setDeleteDialogVisible(false);
    setDayToDelete(null);
  };

  const handleConfirmDeleteDay = async () => {
    try {
      if (!user?.uid || !dayToDelete?.id) return;

      setDeleting(true);

      await deleteTrainingDay({
        uid: user.uid,
        dayId: dayToDelete.id,
      });

      closeDeleteDialog();
      await loadDays();
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo eliminar el día.");
    } finally {
      setDeleting(false);
    }
  };

  const goToDay = (day) => {
    navigation.navigate("WorkoutDay", {
      dayId: day.id,
      dayName: day.name,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
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
              FORTE TRAINING
            </Text>
          </View>

          <Text
            variant="headlineMedium"
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            Entreno
          </Text>

          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Organizá tus días, ejercicios, pesos y repeticiones.
          </Text>
        </View>

        <View style={styles.topActions}>
          <Button
            mode="contained"
            icon="target"
            style={styles.goalButton}
            contentStyle={styles.buttonContent}
            onPress={() => navigation.navigate("Goals")}
          >
            Ver objetivos
          </Button>

          {sortedDays.length > 0 && !loading && (
            <Button
              mode="outlined"
              icon="plus"
              style={[
                styles.createButton,
                {
                  borderColor: premiumBorder,
                },
              ]}
              contentStyle={styles.buttonContent}
              onPress={openCreateDialog}
            >
              Crear día
            </Button>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />

            <Text
              variant="bodyMedium"
              style={{
                marginTop: 12,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              Cargando tus días...
            </Text>
          </View>
        ) : (
          <>
            {!!error && (
              <Card
                mode="contained"
                style={[
                  styles.errorCard,
                  { backgroundColor: theme.colors.errorContainer },
                ]}
              >
                <Card.Content>
                  <Text style={{ color: theme.colors.onErrorContainer }}>
                    {error}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {sortedDays.length === 0 ? (
              <Card
                mode="contained"
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <Card.Content style={styles.emptyContent}>
                  <View
                    style={[styles.emptyIcon, { backgroundColor: softPrimary }]}
                  >
                    <IconButton
                      icon="plus"
                      size={30}
                      iconColor={theme.colors.primary}
                      style={styles.emptyIconButton}
                    />
                  </View>

                  <Text
                    variant="titleLarge"
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Creá tu primer día
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.emptyText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Por ejemplo: Piernas, Pecho, Espalda, Full body o el nombre
                    que uses en tu rutina.
                  </Text>

                  <Button
                    mode="contained"
                    icon="plus"
                    style={styles.emptyButton}
                    contentStyle={styles.buttonContent}
                    onPress={openCreateDialog}
                  >
                    Crear día
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onBackground,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Tus días
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      {sortedDays.length} en total
                    </Text>
                  </View>
                </View>

                {sortedDays.map((day, index) => (
                  <TouchableRipple
                    key={day.id}
                    borderless
                    onPress={() => goToDay(day)}
                    style={[
                      styles.dayCardTouchable,
                      {
                        backgroundColor: premiumSurface,
                        borderColor: premiumBorder,
                      },
                    ]}
                  >
                    <View style={styles.dayCardContent}>
                      <View
                        style={[
                          styles.dayNumber,
                          { backgroundColor: softPrimary },
                        ]}
                      >
                        <Text
                          variant="titleMedium"
                          style={{
                            color: theme.colors.primary,
                            fontWeight: "900",
                          }}
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View style={styles.dayInfo}>
                        <Text
                          variant="titleLarge"
                          style={{
                            color: theme.colors.onSurface,
                            fontWeight: "900",
                            letterSpacing: -0.3,
                            lineHeight: 27,
                          }}
                        >
                          {day.name}
                        </Text>

                        <View style={styles.dayMetaRow}>
                          <IconButton
                            icon="arm-flex-outline"
                            size={16}
                            iconColor={theme.colors.onSurfaceVariant}
                            style={styles.dayMetaIcon}
                          />

                          <Text
                            variant="bodyMedium"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                            }}
                          >
                            Tocá para ver ejercicios
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dayActions}>
                        <IconButton
                          icon="pencil-outline"
                          size={21}
                          iconColor={theme.colors.primary}
                          onPress={() => openEditDialog(day)}
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor: softPrimary,
                            },
                          ]}
                        />

                        <IconButton
                          icon="trash-can-outline"
                          size={21}
                          iconColor={dangerColor}
                          onPress={() => openDeleteDialog(day)}
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor: dangerSoft,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableRipple>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          pointerEvents="box-none"
          style={styles.keyboardAvoidingView}
        >
          <Dialog
            visible={dialogVisible}
            onDismiss={closeDialog}
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
                {saving ? (
                  <ActivityIndicator size={24} color={theme.colors.primary} />
                ) : (
                  <IconButton
                    icon={isEditing ? "pencil-outline" : "plus"}
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
                {isEditing ? "Editar día" : "Nuevo día"}
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
                Asigná un nombre claro para identificar tu rutina.
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                mode="outlined"
                label="Nombre del día"
                value={dayName}
                onChangeText={setDayName}
                autoFocus
                placeholder="Ej: Piernas"
                outlineStyle={{ borderRadius: 16 }}
              />

              {!!error && (
                <View
                  style={[
                    styles.dialogErrorBox,
                    {
                      backgroundColor: theme.colors.errorContainer,
                    },
                  ]}
                >
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onErrorContainer }}
                  >
                    {error}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.dialogActionsCustom}>
              <Button
                mode="outlined"
                disabled={saving}
                onPress={closeDialog}
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
                loading={saving}
                disabled={saving}
                onPress={handleSaveDay}
                style={styles.dialogActionButton}
                contentStyle={styles.dialogActionContent}
              >
                Guardar
              </Button>
            </View>
          </Dialog>

          <Dialog
            visible={deleteDialogVisible}
            onDismiss={closeDeleteDialog}
            style={[
              styles.premiumDialog,
              {
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <View style={styles.deleteDialogContent}>
              <View
                style={[
                  styles.deleteIconBox,
                  {
                    backgroundColor: dangerSoft,
                  },
                ]}
              >
                <IconButton
                  icon="trash-can-outline"
                  size={30}
                  iconColor={dangerColor}
                  style={styles.deleteIcon}
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
                Eliminar día
              </Text>

              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 21,
                }}
              >
                Esta acción eliminará el día de entrenamiento de tu rutina.
              </Text>

              {!!dayToDelete?.name && (
                <View
                  style={[
                    styles.deletePreview,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      fontWeight: "800",
                      marginBottom: 4,
                    }}
                  >
                    DÍA DE ENTRENAMIENTO
                  </Text>

                  <Text
                    variant="titleMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                  >
                    {dayToDelete.name}
                  </Text>
                </View>
              )}

              <View style={styles.deleteActions}>
                <Button
                  mode="outlined"
                  disabled={deleting}
                  onPress={closeDeleteDialog}
                  style={[
                    styles.deleteActionButton,
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
                  icon="trash-can-outline"
                  loading={deleting}
                  disabled={deleting}
                  onPress={handleConfirmDeleteDay}
                  buttonColor={dangerColor}
                  textColor={theme.dark ? "#111827" : "#FFFFFF"}
                  style={styles.deleteActionButton}
                  contentStyle={styles.dialogActionContent}
                >
                  Eliminar
                </Button>
              </View>
            </View>
          </Dialog>
        </KeyboardAvoidingView>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
  },

  container: {
    padding: 20,
    paddingTop: 58,
    paddingBottom: 110,
  },

  header: {
    marginBottom: 18,
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

  topActions: {
    gap: 10,
    marginBottom: 18,
  },

  goalButton: {
    borderRadius: 18,
  },

  createButton: {
    borderRadius: 18,
    borderWidth: 1,
  },

  buttonContent: {
    height: 50,
  },

  loadingBox: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    borderRadius: 20,
    marginBottom: 14,
  },

  emptyCard: {
    borderRadius: 30,
    borderWidth: 1,
  },

  emptyContent: {
    alignItems: "flex-start",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyIconButton: {
    margin: 0,
  },

  emptyTitle: {
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  emptyText: {
    lineHeight: 21,
  },

  emptyButton: {
    borderRadius: 18,
    marginTop: 22,
    alignSelf: "stretch",
  },

  sectionHeader: {
    marginTop: 2,
    marginBottom: 12,
  },

  dayCardTouchable: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },

  dayCardContent: {
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  dayNumber: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },

  dayInfo: {
    flex: 1,
    paddingRight: 8,
  },

  dayMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  dayMetaIcon: {
    margin: 0,
    width: 22,
    height: 22,
    marginRight: 2,
  },

  dayActions: {
    gap: 8,
    alignItems: "center",
  },

  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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

  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
  },

  dialogErrorBox: {
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },

  dialogActionsCustom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },

  dialogActionButton: {
    flex: 1,
    borderRadius: 16,
  },

  dialogActionContent: {
    height: 48,
  },

  deleteDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center",
  },

  deleteIconBox: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  deleteIcon: {
    margin: 0,
  },

  deletePreview: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 18,
    alignItems: "center",
  },

  deleteActions: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 22,
  },

  deleteActionButton: {
    flex: 1,
    borderRadius: 16,
  },
});