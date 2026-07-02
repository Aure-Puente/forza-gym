import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  FAB,
  IconButton,
  Portal,
  Text,
  TextInput,
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

  const handleDeleteDay = (day) => {
    Alert.alert(
      "Eliminar día",
      `¿Querés eliminar "${day.name}"? Más adelante este día también puede tener ejercicios cargados.`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              await deleteTrainingDay({
                uid: user.uid,
                dayId: day.id,
              });

              await loadDays();
            } catch (err) {
              setError(err?.message || "No se pudo eliminar el día.");
              setLoading(false);
            }
          },
        },
      ]
    );
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
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

        <Button
          mode="contained"
          icon="target"
          style={styles.goalButton}
          contentStyle={styles.buttonContent}
          onPress={() => navigation.navigate("Goals")}
        >
          Ver objetivos
        </Button>

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
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: theme.custom.softPrimary },
                    ]}
                  >
                    <Text
                      variant="headlineMedium"
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "900",
                      }}
                    >
                      +
                    </Text>
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
                  <Text
                    variant="titleLarge"
                    style={{
                      color: theme.colors.onBackground,
                      fontWeight: "900",
                    }}
                  >
                    Tus días
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {sortedDays.length} en total
                  </Text>
                </View>

                {sortedDays.map((day, index) => (
                  <Card
                    key={day.id}
                    mode="contained"
                    style={[
                      styles.dayCard,
                      { backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => goToDay(day)}
                  >
                    <Card.Content>
                      <View style={styles.dayRow}>
                        <View
                          style={[
                            styles.dayNumber,
                            { backgroundColor: theme.custom.softPrimary },
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
                            numberOfLines={1}
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "900",
                            }}
                          >
                            {day.name}
                          </Text>

                          <Text
                            variant="bodyMedium"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 4,
                            }}
                          >
                            Tocá para ver ejercicios
                          </Text>
                        </View>

                        <IconButton
                          icon="pencil-outline"
                          size={22}
                          onPress={() => openEditDialog(day)}
                        />

                        <IconButton
                          icon="trash-can-outline"
                          size={22}
                          iconColor={theme.colors.error}
                          onPress={() => handleDeleteDay(day)}
                        />
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {sortedDays.length > 0 && !loading && (
        <FAB
          icon="plus"
          label="Día"
          style={[
            styles.fab,
            { backgroundColor: theme.colors.primary },
          ]}
          color={theme.colors.onPrimary}
          onPress={openCreateDialog}
        />
      )}

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={closeDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>
            {isEditing ? "Editar día" : "Nuevo día"}
          </Dialog.Title>

          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Nombre del día"
              value={dayName}
              onChangeText={setDayName}
              autoFocus
              placeholder="Ej: Piernas"
            />

            {!!error && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error, marginTop: 10 }}
              >
                {error}
              </Text>
            )}
          </Dialog.Content>

          <Dialog.Actions>
            <Button disabled={saving} onPress={closeDialog}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={handleSaveDay}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 62,
    paddingBottom: 130,
  },
  title: {
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 18,
  },
  goalButton: {
    borderRadius: 18,
    marginBottom: 18,
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
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    lineHeight: 21,
  },
  emptyButton: {
    borderRadius: 18,
    marginTop: 22,
  },
  sectionHeader: {
    marginTop: 2,
    marginBottom: 12,
  },
  dayCard: {
    borderRadius: 26,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayNumber: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dayInfo: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 94,
    borderRadius: 18,
  },
});