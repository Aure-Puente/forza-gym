import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Checkbox,
  Dialog,
  FAB,
  IconButton,
  Modal,
  Portal,
  ProgressBar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import { useAuth } from "../context/AuthContext";

import {
  createExercise,
  deleteExercise,
  getExercises,
  updateExercise,
  updateExerciseFull,
} from "../services/exercisesService";

import {
  createWorkoutSession,
  resetExercisesCompletion,
} from "../services/workoutSessionsService";

const formatTime = (totalSeconds) => {
  const safeSeconds = Math.max(0, totalSeconds || 0);

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
};

export default function WorkoutDayScreen({ navigation, route }) {
  const theme = useTheme();
  const { user } = useAuth();

  const dayId = route?.params?.dayId;
  const dayName = route?.params?.dayName || "Entrenamiento";

  const [exercises, setExercises] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("4");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("0");
  const [restSeconds, setRestSeconds] = useState("60");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [timerVisible, setTimerVisible] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);

  const [finishDialogVisible, setFinishDialogVisible] = useState(false);
  const [finishingWorkout, setFinishingWorkout] = useState(false);

  const workoutIntervalRef = useRef(null);

  const isEditing = !!selectedExercise;

  const completedCount = useMemo(() => {
    return exercises.filter((item) => item.completed).length;
  }, [exercises]);

  const totalVolume = useMemo(() => {
    return exercises
      .filter((item) => item.completed)
      .reduce((total, exercise) => {
        const exerciseSets = Number(exercise.sets) || 0;
        const exerciseReps = Number(exercise.reps) || 0;
        const exerciseWeight = Number(exercise.weight) || 0;

        return total + exerciseSets * exerciseReps * exerciseWeight;
      }, 0);
  }, [exercises]);

  const dayProgress = useMemo(() => {
    if (exercises.length === 0) return 0;

    return Math.round((completedCount / exercises.length) * 100);
  }, [completedCount, exercises.length]);

  const hasCompletedExercises = completedCount > 0;

  const progressText = useMemo(() => {
    if (exercises.length === 0) return "Sin ejercicios cargados";

    return `${completedCount}/${exercises.length} ejercicios completados`;
  }, [completedCount, exercises.length]);

  const loadExercises = useCallback(async () => {
    try {
      setError("");

      if (!user?.uid || !dayId) return;

      const response = await getExercises({
        uid: user.uid,
        dayId,
      });

      setExercises(response);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los ejercicios.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, dayId]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    if (isWorkoutRunning) {
      workoutIntervalRef.current = setInterval(() => {
        setWorkoutSeconds((prev) => prev + 1);
      }, 1000);
    } else if (workoutIntervalRef.current) {
      clearInterval(workoutIntervalRef.current);
      workoutIntervalRef.current = null;
    }

    return () => {
      if (workoutIntervalRef.current) {
        clearInterval(workoutIntervalRef.current);
        workoutIntervalRef.current = null;
      }
    };
  }, [isWorkoutRunning]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExercises();
  };

  const resetForm = () => {
    setSelectedExercise(null);
    setExerciseName("");
    setSets("4");
    setReps("10");
    setWeight("0");
    setRestSeconds("60");
    setNotes("");
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogVisible(true);
  };

  const openEditDialog = (exercise) => {
    setSelectedExercise(exercise);
    setExerciseName(exercise.name || "");
    setSets(String(exercise.sets || 1));
    setReps(String(exercise.reps || 1));
    setWeight(String(exercise.weight || 0));
    setRestSeconds(String(exercise.restSeconds || 60));
    setNotes(exercise.notes || "");
    setError("");
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) return;

    setDialogVisible(false);
    resetForm();
  };

  const handleSaveExercise = async () => {
    try {
      setSaving(true);
      setError("");

      if (!exerciseName.trim()) {
        setError("Ingresá el nombre del ejercicio.");
        return;
      }

      if (isEditing) {
        await updateExerciseFull({
          uid: user.uid,
          dayId,
          exerciseId: selectedExercise.id,
          name: exerciseName,
          sets,
          reps,
          weight,
          restSeconds,
          notes,
        });
      } else {
        await createExercise({
          uid: user.uid,
          dayId,
          name: exerciseName,
          sets,
          reps,
          weight,
          restSeconds,
          notes,
          order: exercises.length + 1,
        });
      }

      closeDialog();
      await loadExercises();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el ejercicio.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercise = (exercise) => {
    Alert.alert(
      "Eliminar ejercicio",
      `¿Querés eliminar "${exercise.name}" de ${dayName}?`,
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

              await deleteExercise({
                uid: user.uid,
                dayId,
                exerciseId: exercise.id,
              });

              await loadExercises();
            } catch (err) {
              setError(err?.message || "No se pudo eliminar el ejercicio.");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleCompleted = async (exercise) => {
    try {
      const nextCompleted = !exercise.completed;

      setExercises((prev) =>
        prev.map((item) =>
          item.id === exercise.id
            ? { ...item, completed: nextCompleted }
            : item
        )
      );

      await updateExercise({
        uid: user.uid,
        dayId,
        exerciseId: exercise.id,
        data: {
          completed: nextCompleted,
        },
      });
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el ejercicio.");
      await loadExercises();
    }
  };

  const handleQuickChange = async ({ exercise, field, amount, min = 0 }) => {
    try {
      const currentValue = Number(exercise[field]) || 0;
      const nextValue = Math.max(min, currentValue + amount);

      setExercises((prev) =>
        prev.map((item) =>
          item.id === exercise.id ? { ...item, [field]: nextValue } : item
        )
      );

      await updateExercise({
        uid: user.uid,
        dayId,
        exerciseId: exercise.id,
        data: {
          [field]: nextValue,
        },
      });
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el valor.");
      await loadExercises();
    }
  };

  const handleToggleWorkoutTimer = () => {
    setIsWorkoutRunning((prev) => !prev);
  };

  const handleResetWorkoutTimer = () => {
    setIsWorkoutRunning(false);
    setWorkoutSeconds(0);
  };

  const openFinishDialog = () => {
    if (exercises.length === 0) {
      Alert.alert(
        "Sin ejercicios",
        "Agregá al menos un ejercicio antes de finalizar el entrenamiento."
      );
      return;
    }

    if (!hasCompletedExercises) {
      Alert.alert(
        "Sin ejercicios completados",
        "Marcá al menos un ejercicio como completado antes de finalizar."
      );
      return;
    }

    setFinishDialogVisible(true);
  };

  const closeFinishDialog = () => {
    if (finishingWorkout) return;
    setFinishDialogVisible(false);
  };

  const handleFinishWorkout = async () => {
    try {
      setFinishingWorkout(true);

      await createWorkoutSession({
        uid: user.uid,
        dayId,
        dayName,
        durationSeconds: workoutSeconds,
        exercises,
      });

      await resetExercisesCompletion({
        uid: user.uid,
        dayId,
        exercises,
      });

      setIsWorkoutRunning(false);
      setWorkoutSeconds(0);
      setTimerVisible(false);
      setFinishDialogVisible(false);

      await loadExercises();

      Alert.alert(
        "Entrenamiento guardado",
        "La sesión se guardó correctamente en tu registro."
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "No se pudo finalizar el entrenamiento."
      );
    } finally {
      setFinishingWorkout(false);
    }
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
              {dayName}
            </Text>

            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {progressText}
            </Text>
          </View>
        </View>

        <Card
          mode="contained"
          style={[
            styles.progressCard,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Card.Content>
            <View style={styles.progressTopRow}>
              <View style={styles.progressTextBox}>
                <Text
                  variant="titleMedium"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                  }}
                >
                  Progreso del día
                </Text>

                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 3,
                  }}
                >
                  {completedCount}/{exercises.length} completados ·{" "}
                  {formatNumber(totalVolume)} kg
                </Text>
              </View>

              <Text
                variant="headlineSmall"
                style={{
                  color: theme.colors.primary,
                  fontWeight: "900",
                }}
              >
                {dayProgress}%
              </Text>
            </View>

            <ProgressBar
              progress={dayProgress / 100}
              color={theme.colors.primary}
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            />
          </Card.Content>
        </Card>

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
              Cargando ejercicios...
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

            {exercises.length === 0 ? (
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
                    Agregá tu primer ejercicio
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.emptyText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Cargá ejercicios con series, repeticiones, peso, descanso y
                    notas.
                  </Text>

                  <Button
                    mode="contained"
                    icon="plus"
                    style={styles.emptyButton}
                    contentStyle={styles.buttonContent}
                    onPress={openCreateDialog}
                  >
                    Agregar ejercicio
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
                    Ejercicios
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {exercises.length} en total
                  </Text>
                </View>

                {exercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    mode="contained"
                    style={[
                      styles.exerciseCard,
                      {
                        backgroundColor: exercise.completed
                          ? theme.custom.softPrimary
                          : theme.colors.surface,
                      },
                    ]}
                  >
                    <Card.Content>
                      <View style={styles.exerciseHeader}>
                        <Checkbox.Android
                          status={
                            exercise.completed ? "checked" : "unchecked"
                          }
                          onPress={() => handleToggleCompleted(exercise)}
                        />

                        <View style={styles.exerciseTitleBox}>
                          <Text
                            variant="titleLarge"
                            numberOfLines={1}
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "900",
                              textDecorationLine: exercise.completed
                                ? "line-through"
                                : "none",
                            }}
                          >
                            {exercise.name}
                          </Text>

                          <Text
                            variant="bodySmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 2,
                            }}
                          >
                            Descanso sugerido: {exercise.restSeconds || 0}s
                          </Text>
                        </View>

                        <IconButton
                          icon="pencil-outline"
                          size={22}
                          onPress={() => openEditDialog(exercise)}
                        />

                        <IconButton
                          icon="trash-can-outline"
                          size={22}
                          iconColor={theme.colors.error}
                          onPress={() => handleDeleteExercise(exercise)}
                        />
                      </View>

                      <View style={styles.metricsGrid}>
                        <View
                          style={[
                            styles.metricBox,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Series
                          </Text>

                          <View style={styles.counterRow}>
                            <IconButton
                              icon="minus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "sets",
                                  amount: -1,
                                  min: 1,
                                })
                              }
                            />

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.sets || 0}
                            </Text>

                            <IconButton
                              icon="plus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "sets",
                                  amount: 1,
                                  min: 1,
                                })
                              }
                            />
                          </View>
                        </View>

                        <View
                          style={[
                            styles.metricBox,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Reps
                          </Text>

                          <View style={styles.counterRow}>
                            <IconButton
                              icon="minus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "reps",
                                  amount: -1,
                                  min: 1,
                                })
                              }
                            />

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.reps || 0}
                            </Text>

                            <IconButton
                              icon="plus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "reps",
                                  amount: 1,
                                  min: 1,
                                })
                              }
                            />
                          </View>
                        </View>

                        <View
                          style={[
                            styles.metricBox,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        >
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            Peso
                          </Text>

                          <View style={styles.counterRow}>
                            <IconButton
                              icon="minus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "weight",
                                  amount: -2.5,
                                  min: 0,
                                })
                              }
                            />

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.weight || 0}kg
                            </Text>

                            <IconButton
                              icon="plus"
                              size={17}
                              onPress={() =>
                                handleQuickChange({
                                  exercise,
                                  field: "weight",
                                  amount: 2.5,
                                  min: 0,
                                })
                              }
                            />
                          </View>
                        </View>
                      </View>

                      {!!exercise.notes && (
                        <View
                          style={[
                            styles.notesBox,
                            { borderColor: theme.colors.outlineVariant },
                          ]}
                        >
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {exercise.notes}
                          </Text>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                ))}

                <Card
                  mode="contained"
                  style={[
                    styles.finishCard,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Card.Content>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      Finalizar día
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 6,
                        lineHeight: 21,
                      }}
                    >
                      Guardá este entrenamiento en Registro. Se tomarán los
                      ejercicios marcados como completados.
                    </Text>

                    <Button
                      mode="contained"
                      icon="check-circle-outline"
                      disabled={!hasCompletedExercises}
                      style={styles.finishButton}
                      contentStyle={styles.buttonContent}
                      onPress={openFinishDialog}
                    >
                      Finalizar entrenamiento
                    </Button>
                  </Card.Content>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableRipple
        borderless
        onPress={() => setTimerVisible(true)}
        style={[
          styles.floatingTimer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.floatingTimerContent}>
          <IconButton
            icon={isWorkoutRunning ? "timer" : "timer-outline"}
            size={20}
            iconColor={theme.colors.primary}
            style={styles.floatingTimerIcon}
          />

          <Text
            variant="labelLarge"
            style={{ color: theme.colors.primary, fontWeight: "900" }}
          >
            {formatTime(workoutSeconds)}
          </Text>
        </View>
      </TouchableRipple>

      {exercises.length > 0 && !loading && (
        <FAB
          icon="plus"
          label="Ejercicio"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={openCreateDialog}
        />
      )}

      <Portal>
        <Modal
          visible={timerVisible}
          onDismiss={() => setTimerVisible(false)}
          contentContainerStyle={[
            styles.timerModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.modalHandle} />

          <View style={styles.timerModalHeader}>
            <View>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurface, fontWeight: "900" }}
              >
                Cronómetro
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                Si cerrás este panel, el tiempo sigue corriendo.
              </Text>
            </View>

            <IconButton
              icon="close"
              size={22}
              onPress={() => setTimerVisible(false)}
            />
          </View>

          <Text
            variant="displayLarge"
            style={[styles.bigTimer, { color: theme.colors.primary }]}
          >
            {formatTime(workoutSeconds)}
          </Text>

          <View style={styles.timerActions}>
            <Button
              mode="contained"
              icon={isWorkoutRunning ? "pause" : "play"}
              style={styles.timerMainButton}
              contentStyle={styles.timerButtonContent}
              onPress={handleToggleWorkoutTimer}
            >
              {isWorkoutRunning ? "Pausar" : "Iniciar"}
            </Button>

            <Button
              mode="outlined"
              icon="restart"
              style={styles.timerSecondaryButton}
              contentStyle={styles.timerButtonContent}
              onPress={handleResetWorkoutTimer}
            >
              Reiniciar
            </Button>
          </View>
        </Modal>

        <Dialog
          visible={finishDialogVisible}
          onDismiss={closeFinishDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>Finalizar entrenamiento</Dialog.Title>

          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}
            >
              ¿Seguro que querés terminar el entrenamiento? Se guardarán{" "}
              {completedCount} de {exercises.length} ejercicios completados,
              con {formatNumber(totalVolume)} kg de volumen total.
            </Text>
          </Dialog.Content>

          <Dialog.Actions>
            <Button disabled={finishingWorkout} onPress={closeFinishDialog}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={finishingWorkout}
              disabled={finishingWorkout}
              onPress={handleFinishWorkout}
            >
              Terminar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={dialogVisible}
          onDismiss={closeDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>
            {isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}
          </Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                mode="outlined"
                label="Nombre del ejercicio"
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Ej: Sentadilla"
                style={styles.input}
              />

              <View style={styles.formGrid}>
                <TextInput
                  mode="outlined"
                  label="Series"
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                  style={styles.formInput}
                />

                <TextInput
                  mode="outlined"
                  label="Reps"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  style={styles.formInput}
                />
              </View>

              <View style={styles.formGrid}>
                <TextInput
                  mode="outlined"
                  label="Peso"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  style={styles.formInput}
                  right={<TextInput.Affix text="kg" />}
                />

                <TextInput
                  mode="outlined"
                  label="Descanso sugerido"
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="numeric"
                  style={styles.formInput}
                  right={<TextInput.Affix text="s" />}
                />
              </View>

              <TextInput
                mode="outlined"
                label="Notas"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              {!!error && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.error, marginTop: 4 }}
                >
                  {error}
                </Text>
              )}
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={saving} onPress={closeDialog}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={handleSaveExercise}
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
    paddingTop: 50,
    paddingBottom: 160,
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
  progressCard: {
    borderRadius: 24,
    marginBottom: 16,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTextBox: {
    flex: 1,
    marginRight: 12,
  },
  progressBar: {
    height: 9,
    borderRadius: 999,
    marginTop: 14,
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
  buttonContent: {
    height: 50,
  },
  sectionHeader: {
    marginTop: 2,
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 26,
    marginBottom: 14,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseTitleBox: {
    flex: 1,
  },
  metricsGrid: {
    gap: 10,
    marginTop: 14,
  },
  metricBox: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  counterRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notesBox: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  finishCard: {
    borderRadius: 28,
    marginTop: 6,
    marginBottom: 18,
  },
  finishButton: {
    borderRadius: 18,
    marginTop: 18,
  },
  floatingTimer: {
    position: "absolute",
    right: 20,
    bottom: 156,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    overflow: "hidden",
  },
  floatingTimerContent: {
    minHeight: 46,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  floatingTimerIcon: {
    margin: 0,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 94,
    borderRadius: 18,
  },
  timerModal: {
    marginHorizontal: 16,
    marginTop: "auto",
    marginBottom: 18,
    borderRadius: 30,
    padding: 20,
  },
  modalHandle: {
    width: 46,
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(148, 163, 184, 0.45)",
    alignSelf: "center",
    marginBottom: 16,
  },
  timerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigTimer: {
    fontWeight: "900",
    textAlign: "center",
    marginTop: 18,
    marginBottom: 22,
    letterSpacing: -1.6,
  },
  timerActions: {
    flexDirection: "row",
    gap: 10,
  },
  timerMainButton: {
    flex: 1.2,
    borderRadius: 18,
  },
  timerSecondaryButton: {
    flex: 1,
    borderRadius: 18,
  },
  timerButtonContent: {
    height: 50,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  formGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  formInput: {
    flex: 1,
  },
});