import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
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

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [reordering, setReordering] = useState(false);

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

  const successSoft = theme.dark
    ? "rgba(34,197,94,0.13)"
    : "rgba(22,163,74,0.08)";

  const successColor = theme.dark ? "#86EFAC" : "#15803D";

  const dangerColor = theme.dark ? "#FCA5A5" : "#B91C1C";

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

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const sortExercises = (items) => {
    return [...items].sort((a, b) => {
      const orderA = Number(a.order) || 0;
      const orderB = Number(b.order) || 0;

      if (orderA !== orderB) return orderA - orderB;

      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  };

  const loadExercises = useCallback(async () => {
    try {
      setError("");

      if (!user?.uid || !dayId) return;

      const response = await getExercises({
        uid: user.uid,
        dayId,
      });

      const orderedExercises = Array.isArray(response)
        ? sortExercises(response)
        : [];

      setExercises(orderedExercises);
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

      setDialogVisible(false);
      resetForm();

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

      animateLayout();

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

  const persistExercisesOrder = async (nextExercises) => {
    await Promise.all(
      nextExercises.map((item, index) =>
        updateExercise({
          uid: user.uid,
          dayId,
          exerciseId: item.id,
          data: {
            order: index + 1,
          },
        })
      )
    );
  };

  const handleMoveExercise = async ({ exercise, direction }) => {
    try {
      const currentIndex = exercises.findIndex((item) => item.id === exercise.id);

      if (currentIndex < 0) return;

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (nextIndex < 0 || nextIndex >= exercises.length) return;

      setReordering(true);
      animateLayout();

      const nextExercises = [...exercises];
      const [movedExercise] = nextExercises.splice(currentIndex, 1);

      nextExercises.splice(nextIndex, 0, movedExercise);

      const orderedExercises = nextExercises.map((item, index) => ({
        ...item,
        order: index + 1,
      }));

      setExercises(orderedExercises);

      await persistExercisesOrder(orderedExercises);
    } catch (err) {
      setError(err?.message || "No se pudo guardar el nuevo orden.");
      await loadExercises();
    } finally {
      setReordering(false);
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

  const renderExercise = (exercise, index) => {
    const completed = !!exercise.completed;
    const isFirst = index === 0;
    const isLast = index === exercises.length - 1;

    return (
      <Card
        key={exercise.id}
        mode="contained"
        style={[
          styles.exerciseCard,
          {
            backgroundColor: completed ? softPrimary : premiumSurface,
            borderColor: completed ? theme.colors.primary : premiumBorder,
          },
        ]}
      >
        <Card.Content style={styles.exerciseCardContent}>
          <View style={styles.exerciseTopActions}>
            <TouchableRipple
              borderless
              onPress={() => handleToggleCompleted(exercise)}
              style={[
                styles.completeButton,
                {
                  backgroundColor: completed
                    ? theme.colors.primary
                    : mutedSurface,
                  borderColor: completed
                    ? theme.colors.primary
                    : premiumBorder,
                },
              ]}
            >
              <IconButton
                icon={completed ? "check-bold" : "check"}
                size={20}
                iconColor={
                  completed
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant
                }
                style={styles.inlineIcon}
              />
            </TouchableRipple>

            <View
              style={[
                styles.exerciseOrderBox,
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
                  fontWeight: "900",
                }}
              >
                #{index + 1}
              </Text>
            </View>

            <View style={styles.exerciseActionsRight}>
              <IconButton
                icon="arrow-up"
                size={20}
                disabled={isFirst || reordering}
                style={styles.smallActionIcon}
                iconColor={
                  isFirst
                    ? theme.colors.outline
                    : theme.colors.onSurfaceVariant
                }
                onPress={() =>
                  handleMoveExercise({
                    exercise,
                    direction: "up",
                  })
                }
              />

              <IconButton
                icon="arrow-down"
                size={20}
                disabled={isLast || reordering}
                style={styles.smallActionIcon}
                iconColor={
                  isLast
                    ? theme.colors.outline
                    : theme.colors.onSurfaceVariant
                }
                onPress={() =>
                  handleMoveExercise({
                    exercise,
                    direction: "down",
                  })
                }
              />

              <IconButton
                icon="pencil-outline"
                size={21}
                style={styles.smallActionIcon}
                iconColor={theme.colors.primary}
                onPress={() => openEditDialog(exercise)}
              />

              <IconButton
                icon="trash-can-outline"
                size={21}
                style={styles.smallActionIcon}
                iconColor={dangerColor}
                onPress={() => handleDeleteExercise(exercise)}
              />
            </View>
          </View>

          <View style={styles.exerciseTitleRow}>
            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
                lineHeight: 28,
                textDecorationLine: completed ? "line-through" : "none",
              }}
            >
              {exercise.name}
            </Text>

            <View style={styles.exerciseMetaRow}>
              <View
                style={[
                  styles.restPill,
                  {
                    backgroundColor: mutedSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <IconButton
                  icon="timer-outline"
                  size={15}
                  iconColor={theme.colors.primary}
                  style={styles.restPillIcon}
                />

                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontWeight: "800",
                  }}
                >
                  Descanso {exercise.restSeconds || 0}s
                </Text>
              </View>

              {completed && (
                <View
                  style={[
                    styles.completedPill,
                    {
                      backgroundColor: successSoft,
                    },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{
                      color: successColor,
                      fontWeight: "900",
                    }}
                  >
                    Completado
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View
              style={[
                styles.metricBox,
                {
                  backgroundColor: mutedSurface,
                  borderColor: premiumBorder,
                },
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
                  style={styles.counterButton}
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
                  variant="headlineSmall"
                  style={[
                    styles.counterValue,
                    {
                      color: theme.colors.onSurface,
                    },
                  ]}
                >
                  {exercise.reps || 0}
                </Text>

                <IconButton
                  icon="plus"
                  size={17}
                  style={styles.counterButton}
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
                {
                  backgroundColor: mutedSurface,
                  borderColor: premiumBorder,
                },
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
                  style={styles.counterButton}
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
                  variant="headlineSmall"
                  style={[
                    styles.counterValue,
                    {
                      color: theme.colors.onSurface,
                    },
                  ]}
                >
                  {exercise.sets || 0}
                </Text>

                <IconButton
                  icon="plus"
                  size={17}
                  style={styles.counterButton}
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
                {
                  backgroundColor: softPrimary,
                  borderColor: theme.colors.primary,
                },
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
                  style={styles.counterButton}
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
                  variant="headlineSmall"
                  style={[
                    styles.counterValue,
                    {
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  {exercise.weight || 0}kg
                </Text>

                <IconButton
                  icon="plus"
                  size={17}
                  style={styles.counterButton}
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
                {
                  borderColor: premiumBorder,
                  backgroundColor: mutedSurface,
                },
              ]}
            >
              <IconButton
                icon="note-text-outline"
                size={17}
                iconColor={theme.colors.primary}
                style={styles.notesIcon}
              />

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  lineHeight: 19,
                  flex: 1,
                }}
              >
                {exercise.notes}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: mutedSurface,
                borderColor: premiumBorder,
              },
            ]}
            iconColor={theme.colors.onBackground}
          />

          <View style={styles.headerText}>
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
              variant="headlineSmall"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              {dayName}
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
              }}
            >
              {progressText}
            </Text>
          </View>
        </View>

        <Card
          mode="contained"
          style={[
            styles.progressCard,
            {
              backgroundColor: premiumSurface,
              borderColor: premiumBorder,
            },
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

              <View
                style={[
                  styles.progressPercentBox,
                  {
                    backgroundColor: softPrimary,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: "900",
                  }}
                >
                  {dayProgress}%
                </Text>
              </View>
            </View>

            <ProgressBar
              progress={dayProgress / 100}
              color={theme.colors.primary}
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.dark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(15,23,42,0.08)",
                },
              ]}
            />
          </Card.Content>
        </Card>

        {!loading && (
          <Card
            mode="contained"
            style={[
              styles.addExerciseCard,
              {
                backgroundColor: premiumSurface,
                borderColor: premiumBorder,
              },
            ]}
          >
            <Card.Content>
              <View style={styles.addExerciseRow}>
                <View
                  style={[
                    styles.addExerciseIconBox,
                    {
                      backgroundColor: softPrimary,
                    },
                  ]}
                >
                  <IconButton
                    icon="plus"
                    size={20}
                    iconColor={theme.colors.primary}
                    style={styles.addExerciseIcon}
                  />
                </View>

                <View style={styles.addExerciseTextBox}>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                    }}
                  >
                    Rutina del día
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    Agregá ejercicios cuando armes o ajustes tu rutina.
                  </Text>
                </View>

                <Button
                  mode="contained"
                  icon="plus"
                  style={styles.addExerciseButton}
                  contentStyle={styles.addExerciseButtonContent}
                  onPress={openCreateDialog}
                >
                  Agregar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

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
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <Card.Content>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: softPrimary },
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
                  <View>
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
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 2,
                      }}
                    >
                      Usá las flechas para ajustar el orden.
                    </Text>
                  </View>

                  {reordering && <ActivityIndicator size="small" />}
                </View>

                {exercises.map(renderExercise)}

                <Card
                  mode="contained"
                  style={[
                    styles.finishCard,
                    {
                      backgroundColor: premiumSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Card.Content>
                    <View
                      style={[
                        styles.finishIconBox,
                        {
                          backgroundColor: successSoft,
                        },
                      ]}
                    >
                      <IconButton
                        icon="check-circle-outline"
                        size={23}
                        iconColor={successColor}
                        style={styles.finishIcon}
                      />
                    </View>

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
            backgroundColor: isWorkoutRunning
              ? theme.colors.primary
              : theme.colors.surface,
            borderColor: isWorkoutRunning
              ? theme.colors.primary
              : premiumBorder,
          },
        ]}
      >
        <View style={styles.floatingTimerContent}>
          <IconButton
            icon={isWorkoutRunning ? "timer" : "timer-outline"}
            size={20}
            iconColor={
              isWorkoutRunning ? theme.colors.onPrimary : theme.colors.primary
            }
            style={styles.floatingTimerIcon}
          />

          <Text
            variant="labelLarge"
            style={{
              color: isWorkoutRunning
                ? theme.colors.onPrimary
                : theme.colors.primary,
              fontWeight: "900",
            }}
          >
            {formatTime(workoutSeconds)}
          </Text>
        </View>
      </TouchableRipple>

      <Portal>
        <Modal
          visible={timerVisible}
          onDismiss={() => setTimerVisible(false)}
          theme={{
            colors: {
              backdrop: "rgba(0,0,0,0.72)",
            },
          }}
          contentContainerStyle={[
            styles.timerModal,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View
            style={[
              styles.timerIconBox,
              {
                backgroundColor: softPrimary,
              },
            ]}
          >
            <IconButton
              icon="timer-outline"
              size={28}
              iconColor={theme.colors.primary}
              style={styles.timerIcon}
            />
          </View>

          <View style={styles.timerModalHeader}>
            <View style={styles.timerModalTitleBox}>
              <Text
                variant="titleLarge"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                Cronómetro
              </Text>

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                Si cerrás este panel, el tiempo sigue corriendo.
              </Text>
            </View>
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
              style={[
                styles.timerSecondaryButton,
                {
                  borderColor: premiumBorder,
                },
              ]}
              contentStyle={styles.timerButtonContent}
              onPress={handleResetWorkoutTimer}
            >
              Reiniciar
            </Button>
          </View>

          <Button
            mode="text"
            icon="close"
            style={styles.timerCloseButton}
            onPress={() => setTimerVisible(false)}
          >
            Cerrar
          </Button>
        </Modal>

        <Dialog
          visible={finishDialogVisible}
          onDismiss={closeFinishDialog}
          style={[
            styles.premiumDialog,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Dialog.Title>Finalizar entrenamiento</Dialog.Title>

          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                lineHeight: 22,
              }}
            >
              ¿Seguro que querés terminar el entrenamiento? Se guardarán{" "}
              {completedCount} de {exercises.length} ejercicios completados, con{" "}
              {formatNumber(totalVolume)} kg de volumen total.
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
          style={[
            styles.premiumDialog,
            styles.exerciseDialog,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Dialog.Title>
            {isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}
          </Dialog.Title>

          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                mode="outlined"
                label="Nombre del ejercicio"
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Ej: Sentadilla"
                style={styles.input}
                outlineStyle={styles.inputOutline}
              />

              <View style={styles.formGrid}>
                <TextInput
                  mode="outlined"
                  label="Series"
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                  style={styles.formInput}
                  outlineStyle={styles.inputOutline}
                />

                <TextInput
                  mode="outlined"
                  label="Reps"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                  style={styles.formInput}
                  outlineStyle={styles.inputOutline}
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
                  outlineStyle={styles.inputOutline}
                />

                <TextInput
                  mode="outlined"
                  label="Descanso"
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="numeric"
                  style={styles.formInput}
                  right={<TextInput.Affix text="s" />}
                  outlineStyle={styles.inputOutline}
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
                outlineStyle={styles.inputOutline}
              />

              {!!error && (
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.error,
                    marginTop: 4,
                    fontWeight: "700",
                  }}
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
    paddingBottom: 150,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    margin: 0,
    marginRight: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
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
    marginBottom: 10,
  },

  eyebrowIcon: {
    width: 26,
    height: 26,
    margin: 0,
  },

  title: {
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  progressCard: {
    borderRadius: 28,
    marginBottom: 14,
    borderWidth: 1,
  },

  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressTextBox: {
    flex: 1,
    marginRight: 12,
  },

  progressPercentBox: {
    minWidth: 76,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    marginTop: 16,
  },

  addExerciseCard: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
  },

  addExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  addExerciseIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  addExerciseIcon: {
    margin: 0,
  },

  addExerciseTextBox: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },

  addExerciseButton: {
    borderRadius: 16,
    flexShrink: 0,
  },

  addExerciseButtonContent: {
    height: 44,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  exerciseCard: {
    borderRadius: 28,
    marginBottom: 14,
    borderWidth: 1,
  },

  exerciseCardContent: {
    paddingVertical: 16,
  },

  exerciseTopActions: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  exerciseOrderBox: {
    height: 32,
    minWidth: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    paddingHorizontal: 10,
  },

  exerciseActionsRight: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
  },

  smallActionIcon: {
    margin: -2,
  },

  inlineIcon: {
    margin: 0,
  },

  exerciseTitleRow: {
    marginTop: 2,
  },

  exerciseMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  restPill: {
    minHeight: 30,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  restPillIcon: {
    width: 25,
    height: 25,
    margin: 0,
  },

  completedPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  metricsGrid: {
    gap: 10,
    marginTop: 16,
  },

  metricBox: {
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 4,
  },

  counterRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  counterButton: {
    margin: 0,
  },

  counterValue: {
    fontWeight: "900",
    textAlign: "center",
    minWidth: 96,
    letterSpacing: -0.6,
  },

  notesBox: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingRight: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  notesIcon: {
    margin: 0,
  },

  finishCard: {
    borderRadius: 30,
    marginTop: 6,
    marginBottom: 18,
    borderWidth: 1,
  },

  finishIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  finishIcon: {
    margin: 0,
  },

  finishButton: {
    borderRadius: 18,
    marginTop: 18,
  },

  floatingTimer: {
    position: "absolute",
    right: 18,
    bottom: 116,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 5,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    overflow: "hidden",
  },

  floatingTimerContent: {
    minHeight: 48,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  floatingTimerIcon: {
    margin: 0,
  },

  timerModal: {
    marginHorizontal: 22,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: "center",
  },

  timerIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  timerIcon: {
    margin: 0,
  },

  timerModalHeader: {
    width: "100%",
    alignItems: "center",
  },

  timerModalTitleBox: {
    alignItems: "center",
  },

  bigTimer: {
    fontWeight: "900",
    textAlign: "center",
    marginTop: 22,
    marginBottom: 22,
    letterSpacing: -1.6,
  },

  timerActions: {
    width: "100%",
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

  timerCloseButton: {
    marginTop: 10,
  },

  premiumDialog: {
    borderRadius: 24,
    backgroundColor: "transparent",
  },

  exerciseDialog: {
    maxHeight: "86%",
  },

  dialogScrollArea: {
    maxHeight: 430,
    paddingHorizontal: 0,
  },

  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
  },

  input: {
    marginBottom: 12,
  },

  inputOutline: {
    borderRadius: 16,
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