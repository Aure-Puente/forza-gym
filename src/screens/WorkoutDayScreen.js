//Importaciones:
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));

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

const getWorkoutLocalKey = ({ uid, dayId }) => {
  return `@forte_workout_day_state_${uid}_${dayId}`;
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
  const [workoutBaseSeconds, setWorkoutBaseSeconds] = useState(0);
  const [workoutStartedAt, setWorkoutStartedAt] = useState(null);

  const [setProgressByExerciseId, setSetProgressByExerciseId] = useState({});
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);

  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restExercise, setRestExercise] = useState(null);
  const [restDurationSeconds, setRestDurationSeconds] = useState(60);
  const [restRemainingSeconds, setRestRemainingSeconds] = useState(60);
  const [restEndAt, setRestEndAt] = useState(null);
  const [isRestRunning, setIsRestRunning] = useState(false);
  const [restFinished, setRestFinished] = useState(false);

  const [finishDialogVisible, setFinishDialogVisible] = useState(false);
  const [finishingWorkout, setFinishingWorkout] = useState(false);

  const [localStateLoaded, setLocalStateLoaded] = useState(false);

  const syncIntervalRef = useRef(null);

  const isEditing = !!selectedExercise;

  const localStorageKey = useMemo(() => {
    if (!user?.uid || !dayId) return null;

    return getWorkoutLocalKey({
      uid: user.uid,
      dayId,
    });
  }, [user?.uid, dayId]);

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

  const elevatedSurface = theme.dark
    ? "rgba(255,255,255,0.075)"
    : "rgba(255,255,255,0.98)";

  const successSoft = theme.dark
    ? "rgba(34,197,94,0.13)"
    : "rgba(22,163,74,0.08)";

  const successColor = theme.dark ? "#86EFAC" : "#15803D";

  const dangerSoft = theme.dark
    ? "rgba(248,113,113,0.12)"
    : "rgba(220,38,38,0.07)";

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

  const getExerciseTotalSets = (exercise) => {
    return Math.max(1, Number(exercise?.sets) || 1);
  };

  const getExerciseCompletedSets = (exercise) => {
    if (!exercise?.id) return 0;

    const totalSets = getExerciseTotalSets(exercise);
    const localCompletedSets =
      Number(setProgressByExerciseId?.[exercise.id]) || 0;

    if (localCompletedSets > 0) {
      return Math.min(totalSets, localCompletedSets);
    }

    if (exercise.completed) {
      return totalSets;
    }

    return 0;
  };

  const syncLiveTimers = useCallback(() => {
    const now = Date.now();

    if (isWorkoutRunning && workoutStartedAt) {
      const elapsedSeconds = Math.floor((now - workoutStartedAt) / 1000);
      const nextWorkoutSeconds = workoutBaseSeconds + elapsedSeconds;

      setWorkoutSeconds(Math.max(0, nextWorkoutSeconds));
    }

    if (isRestRunning && restEndAt) {
      const nextRemaining = Math.max(0, Math.ceil((restEndAt - now) / 1000));

      setRestRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        setIsRestRunning(false);
        setRestFinished(true);
      }
    }
  }, [
    isWorkoutRunning,
    workoutStartedAt,
    workoutBaseSeconds,
    isRestRunning,
    restEndAt,
  ]);

  const loadLocalState = useCallback(async () => {
    try {
      if (!localStorageKey) return;

      const rawState = await AsyncStorage.getItem(localStorageKey);

      if (!rawState) {
        setLocalStateLoaded(true);
        return;
      }

      const savedState = JSON.parse(rawState);

      if (savedState?.setProgressByExerciseId) {
        setSetProgressByExerciseId(savedState.setProgressByExerciseId);
      }

      if (savedState?.expandedExerciseId) {
        setExpandedExerciseId(savedState.expandedExerciseId);
      }

      if (savedState?.workoutTimer) {
        const workoutTimer = savedState.workoutTimer;

        const savedBaseSeconds = Number(workoutTimer.baseSeconds) || 0;
        const savedStartedAt = Number(workoutTimer.startedAt) || null;
        const savedRunning = !!workoutTimer.isRunning;

        if (savedRunning && savedStartedAt) {
          const elapsedSeconds = Math.floor(
            (Date.now() - savedStartedAt) / 1000
          );

          setWorkoutBaseSeconds(savedBaseSeconds);
          setWorkoutStartedAt(savedStartedAt);
          setIsWorkoutRunning(true);
          setWorkoutSeconds(Math.max(0, savedBaseSeconds + elapsedSeconds));
        } else {
          setWorkoutBaseSeconds(savedBaseSeconds);
          setWorkoutStartedAt(null);
          setIsWorkoutRunning(false);
          setWorkoutSeconds(savedBaseSeconds);
        }
      }

      if (savedState?.restTimer) {
        const restTimer = savedState.restTimer;
        const savedEndAt = Number(restTimer.endAt) || null;
        const savedDurationSeconds = Number(restTimer.durationSeconds) || 60;
        const savedRunning = !!restTimer.isRunning;

        const remainingSeconds = savedEndAt
          ? Math.max(0, Math.ceil((savedEndAt - Date.now()) / 1000))
          : savedDurationSeconds;

        setRestExercise(restTimer.exercise || null);
        setRestDurationSeconds(savedDurationSeconds);
        setRestEndAt(savedEndAt);
        setRestRemainingSeconds(remainingSeconds);
        setIsRestRunning(savedRunning && remainingSeconds > 0);
        setRestFinished(savedRunning && remainingSeconds <= 0);
      }
    } catch (err) {
      console.log("Error cargando estado local del entrenamiento:", err);
    } finally {
      setLocalStateLoaded(true);
    }
  }, [localStorageKey]);

  const saveLocalState = useCallback(async () => {
    try {
      if (!localStorageKey || !localStateLoaded) return;

      const stateToSave = {
        setProgressByExerciseId,
        expandedExerciseId,
        workoutTimer: {
          baseSeconds: workoutBaseSeconds,
          startedAt: workoutStartedAt,
          isRunning: isWorkoutRunning,
        },
        restTimer: {
          exercise: restExercise,
          durationSeconds: restDurationSeconds,
          remainingSeconds: restRemainingSeconds,
          endAt: restEndAt,
          isRunning: isRestRunning,
          finished: restFinished,
        },
        updatedAt: Date.now(),
      };

      await AsyncStorage.setItem(localStorageKey, JSON.stringify(stateToSave));
    } catch (err) {
      console.log("Error guardando estado local del entrenamiento:", err);
    }
  }, [
    localStorageKey,
    localStateLoaded,
    setProgressByExerciseId,
    expandedExerciseId,
    workoutBaseSeconds,
    workoutStartedAt,
    isWorkoutRunning,
    restExercise,
    restDurationSeconds,
    restRemainingSeconds,
    restEndAt,
    isRestRunning,
    restFinished,
  ]);

  const clearLocalState = useCallback(async () => {
    try {
      if (!localStorageKey) return;

      await AsyncStorage.removeItem(localStorageKey);
    } catch (err) {
      console.log("Error limpiando estado local del entrenamiento:", err);
    }
  }, [localStorageKey]);

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
    loadLocalState();
  }, [loadLocalState]);

  useEffect(() => {
    saveLocalState();
  }, [saveLocalState]);

  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      syncLiveTimers();
    }, 1000);

    const subscription = AppState.addEventListener("change", () => {
      syncLiveTimers();
    });

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      subscription?.remove?.();
    };
  }, [syncLiveTimers]);

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

              setSetProgressByExerciseId((prev) => {
                const next = { ...prev };
                delete next[exercise.id];
                return next;
              });

              setExpandedExerciseId((currentId) =>
                currentId === exercise.id ? null : currentId
              );

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

  const setExerciseCompletedState = async ({ exercise, completed }) => {
    animateLayout();

    const totalSets = getExerciseTotalSets(exercise);

    setExercises((prev) =>
      prev.map((item) =>
        item.id === exercise.id ? { ...item, completed } : item
      )
    );

    setSetProgressByExerciseId((prev) => ({
      ...prev,
      [exercise.id]: completed ? totalSets : 0,
    }));

    await updateExercise({
      uid: user.uid,
      dayId,
      exerciseId: exercise.id,
      data: {
        completed,
      },
    });
  };

  const handleToggleCompleted = async (exercise) => {
    try {
      const nextCompleted = !exercise.completed;

      await setExerciseCompletedState({
        exercise,
        completed: nextCompleted,
      });
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el ejercicio.");
      await loadExercises();
    }
  };

  const handleCompleteSet = async ({ exercise, setNumber }) => {
    try {
      const totalSets = getExerciseTotalSets(exercise);
      const currentCompletedSets = getExerciseCompletedSets(exercise);
      const nextCompletedSets = Math.min(
        totalSets,
        Math.max(currentCompletedSets, setNumber)
      );

      animateLayout();

      setSetProgressByExerciseId((prev) => ({
        ...prev,
        [exercise.id]: nextCompletedSets,
      }));

      if (nextCompletedSets >= totalSets && !exercise.completed) {
        setExercises((prev) =>
          prev.map((item) =>
            item.id === exercise.id ? { ...item, completed: true } : item
          )
        );

        await updateExercise({
          uid: user.uid,
          dayId,
          exerciseId: exercise.id,
          data: {
            completed: true,
          },
        });
      }
    } catch (err) {
      setError(err?.message || "No se pudo actualizar la serie.");
      await loadExercises();
    }
  };

  const handleResetExerciseSets = async (exercise) => {
    try {
      animateLayout();

      setSetProgressByExerciseId((prev) => ({
        ...prev,
        [exercise.id]: 0,
      }));

      if (exercise.completed) {
        setExercises((prev) =>
          prev.map((item) =>
            item.id === exercise.id ? { ...item, completed: false } : item
          )
        );

        await updateExercise({
          uid: user.uid,
          dayId,
          exerciseId: exercise.id,
          data: {
            completed: false,
          },
        });
      }
    } catch (err) {
      setError(err?.message || "No se pudo reiniciar las series.");
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

      if (field === "sets") {
        setSetProgressByExerciseId((prev) => ({
          ...prev,
          [exercise.id]: Math.min(Number(prev?.[exercise.id]) || 0, nextValue),
        }));
      }

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
      const currentIndex = exercises.findIndex(
        (item) => item.id === exercise.id
      );

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
    const now = Date.now();

    if (isWorkoutRunning) {
      const elapsedSeconds = workoutStartedAt
        ? Math.floor((now - workoutStartedAt) / 1000)
        : 0;

      const nextBaseSeconds = workoutBaseSeconds + elapsedSeconds;

      setWorkoutBaseSeconds(nextBaseSeconds);
      setWorkoutSeconds(nextBaseSeconds);
      setWorkoutStartedAt(null);
      setIsWorkoutRunning(false);
      return;
    }

    setWorkoutStartedAt(now);
    setIsWorkoutRunning(true);
  };

  const handleResetWorkoutTimer = () => {
    setIsWorkoutRunning(false);
    setWorkoutStartedAt(null);
    setWorkoutBaseSeconds(0);
    setWorkoutSeconds(0);
  };

  const handleStartRestTimer = (exercise) => {
    const durationSeconds = Math.max(1, Number(exercise?.restSeconds) || 60);
    const endAt = Date.now() + durationSeconds * 1000;

    setRestExercise({
      id: exercise.id,
      name: exercise.name || "Ejercicio",
    });
    setRestDurationSeconds(durationSeconds);
    setRestRemainingSeconds(durationSeconds);
    setRestEndAt(endAt);
    setRestFinished(false);
    setIsRestRunning(true);
    setRestTimerVisible(true);
  };

  const handleClearRestTimer = () => {
    setRestTimerVisible(false);
    setIsRestRunning(false);
    setRestFinished(false);
    setRestEndAt(null);
    setRestRemainingSeconds(restDurationSeconds);
    setRestExercise(null);
  };

  const handlePressFloatingRestTimer = () => {
    if (restFinished) {
      handleClearRestTimer();
      return;
    }

    setRestTimerVisible(true);
  };

  const handleCloseRestTimer = () => {
    setRestTimerVisible(false);
  };

  const handleStopRestTimer = () => {
    setIsRestRunning(false);
    setRestFinished(false);
    setRestEndAt(null);
    setRestRemainingSeconds(restDurationSeconds);
  };

  const handleRestartRestTimer = () => {
    const durationSeconds = Math.max(1, Number(restDurationSeconds) || 60);
    const endAt = Date.now() + durationSeconds * 1000;

    setRestRemainingSeconds(durationSeconds);
    setRestEndAt(endAt);
    setRestFinished(false);
    setIsRestRunning(true);
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

      const finalWorkoutSeconds =
        isWorkoutRunning && workoutStartedAt
          ? workoutBaseSeconds +
            Math.floor((Date.now() - workoutStartedAt) / 1000)
          : workoutSeconds;

      await createWorkoutSession({
        uid: user.uid,
        dayId,
        dayName,
        durationSeconds: finalWorkoutSeconds,
        exercises,
      });

      await resetExercisesCompletion({
        uid: user.uid,
        dayId,
        exercises,
      });

      setIsWorkoutRunning(false);
      setWorkoutStartedAt(null);
      setWorkoutBaseSeconds(0);
      setWorkoutSeconds(0);
      setTimerVisible(false);

      setRestTimerVisible(false);
      setIsRestRunning(false);
      setRestFinished(false);
      setRestEndAt(null);
      setRestRemainingSeconds(60);
      setRestExercise(null);

      setSetProgressByExerciseId({});
      setExpandedExerciseId(null);
      setFinishDialogVisible(false);

      await clearLocalState();
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

  const handleToggleExerciseExpanded = (exerciseId) => {
    animateLayout();

    setExpandedExerciseId((currentId) =>
      currentId === exerciseId ? null : exerciseId
    );
  };
    const renderExercise = (exercise, index) => {
    const completed = !!exercise.completed;
    const expanded = expandedExerciseId === exercise.id;
    const isFirst = index === 0;
    const isLast = index === exercises.length - 1;

    const totalSets = getExerciseTotalSets(exercise);
    const completedSets = getExerciseCompletedSets(exercise);
    const remainingSets = Math.max(0, totalSets - completedSets);
    const setsProgress = totalSets > 0 ? completedSets / totalSets : 0;

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
        <TouchableRipple
          borderless
          onPress={() => handleToggleExerciseExpanded(exercise.id)}
          style={styles.exerciseAccordionHeader}
        >
          <View>
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

              <View style={styles.exerciseHeaderInfo}>
                <Text
                  variant="titleMedium"
                  numberOfLines={1}
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    letterSpacing: -0.25,
                    textDecorationLine: completed ? "line-through" : "none",
                  }}
                >
                  {exercise.name}
                </Text>

                <Text
                  variant="bodySmall"
                  numberOfLines={1}
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 3,
                  }}
                >
                  {exercise.sets || 0} series · {exercise.reps || 0} reps ·{" "}
                  {exercise.weight || 0}kg · {completedSets}/{totalSets} hechas
                </Text>
              </View>

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

              <IconButton
                icon={expanded ? "chevron-up" : "chevron-down"}
                size={24}
                iconColor={theme.colors.primary}
                style={styles.accordionChevron}
              />
            </View>

            {completed && (
              <View style={styles.exerciseMetaRowCompact}>
                <View
                  style={[
                    styles.completedPill,
                    {
                      backgroundColor: successSoft,
                    },
                  ]}
                >
                  <IconButton
                    icon="check-circle-outline"
                    size={15}
                    iconColor={successColor}
                    style={styles.completedPillIcon}
                  />

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
              </View>
            )}
          </View>
        </TouchableRipple>

        {expanded && (
          <Card.Content style={styles.exerciseCardContent}>
            <View style={styles.exerciseActionsPanel}>
              <View style={styles.exerciseActionsLeft}>
                <IconButton
                  icon="arrow-up"
                  size={20}
                  disabled={isFirst || reordering}
                  style={[
                    styles.smallActionIcon,
                    {
                      backgroundColor: mutedSurface,
                    },
                  ]}
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
                  style={[
                    styles.smallActionIcon,
                    {
                      backgroundColor: mutedSurface,
                    },
                  ]}
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
              </View>

              <View style={styles.exerciseActionsRight}>
                <IconButton
                  icon="pencil-outline"
                  size={21}
                  style={[
                    styles.smallActionIcon,
                    {
                      backgroundColor: softPrimary,
                    },
                  ]}
                  iconColor={theme.colors.primary}
                  onPress={() => openEditDialog(exercise)}
                />

                <IconButton
                  icon="trash-can-outline"
                  size={21}
                  style={[
                    styles.smallActionIcon,
                    {
                      backgroundColor: dangerSoft,
                    },
                  ]}
                  iconColor={dangerColor}
                  onPress={() => handleDeleteExercise(exercise)}
                />
              </View>
            </View>

            <View
              style={[
                styles.setsBox,
                {
                  backgroundColor: completed ? premiumSurface : mutedSurface,
                  borderColor: completed ? theme.colors.primary : premiumBorder,
                },
              ]}
            >
              <View style={styles.setsHeader}>
                <View style={styles.setsHeaderText}>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                    }}
                  >
                    Series
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    {completedSets}/{totalSets} hechas · {remainingSets} restante
                    {remainingSets === 1 ? "" : "s"}
                  </Text>
                </View>

                <Button
                  mode="text"
                  compact
                  icon="restart"
                  disabled={completedSets === 0}
                  onPress={() => handleResetExerciseSets(exercise)}
                  textColor={theme.colors.primary}
                >
                  Reiniciar
                </Button>
              </View>

              <ProgressBar
                progress={setsProgress}
                color={theme.colors.primary}
                style={[
                  styles.setsProgressBar,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.08)",
                  },
                ]}
              />

              <View style={styles.setButtonsGrid}>
                {Array.from({ length: totalSets }).map((_, setIndex) => {
                  const setNumber = setIndex + 1;
                  const setDone = setNumber <= completedSets;

                  return (
                    <TouchableRipple
                      key={`${exercise.id}-set-${setNumber}`}
                      borderless
                      disabled={setDone}
                      onPress={() =>
                        handleCompleteSet({
                          exercise,
                          setNumber,
                        })
                      }
                      style={[
                        styles.setButton,
                        {
                          backgroundColor: setDone
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: setDone
                            ? theme.colors.primary
                            : premiumBorder,
                          opacity: setDone ? 0.95 : 1,
                        },
                      ]}
                    >
                      <View style={styles.setButtonContent}>
                        <IconButton
                          icon={setDone ? "check-bold" : "dumbbell"}
                          size={16}
                          iconColor={
                            setDone
                              ? theme.colors.onPrimary
                              : theme.colors.primary
                          }
                          style={styles.setButtonIcon}
                        />

                        <Text
                          variant="labelMedium"
                          style={{
                            color: setDone
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                            fontWeight: "900",
                          }}
                        >
                          {setNumber}
                        </Text>
                      </View>
                    </TouchableRipple>
                  );
                })}
              </View>

              <TouchableRipple
                borderless
                onPress={() => handleStartRestTimer(exercise)}
                style={[
                  styles.restButtonTouchable,
                  {
                    backgroundColor: softPrimary,
                    borderColor: theme.colors.primary,
                  },
                ]}
              >
                <View style={styles.restButtonPremiumContent}>
                  <View
                    style={[
                      styles.restButtonIconBox,
                      {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <IconButton
                      icon="timer-sand"
                      size={18}
                      iconColor={theme.colors.onPrimary}
                      style={styles.restButtonIcon}
                    />
                  </View>

                  <View style={styles.restButtonTextBox}>
                    <Text
                      variant="labelLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      Descansar
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 1,
                      }}
                    >
                    Descanso de {exercise.restSeconds || 0}s
                    </Text>
                  </View>

                  <IconButton
                    icon="chevron-right"
                    size={22}
                    iconColor={theme.colors.primary}
                    style={styles.restButtonArrow}
                  />
                </View>
              </TouchableRipple>
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
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.onSurfaceVariant}
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
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.primary}
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
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.onSurfaceVariant}
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
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.primary}
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
                    backgroundColor: mutedSurface,
                    borderColor: premiumBorder,
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
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.onSurfaceVariant}
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
                        color: theme.colors.onSurface,
                      },
                    ]}
                  >
                    {exercise.weight || 0}kg
                  </Text>

                  <IconButton
                    icon="plus"
                    size={17}
                    style={[
                      styles.counterButton,
                      {
                        backgroundColor: elevatedSurface,
                      },
                    ]}
                    iconColor={theme.colors.primary}
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
        )}
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
                <Card.Content style={styles.emptyContent}>
                  <View
                    style={[
                      styles.emptyIcon,
                      {
                        backgroundColor: softPrimary,
                        borderColor: premiumBorder,
                      },
                    ]}
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
                  <View style={styles.sectionHeaderText}>
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
                      Tocá un ejercicio para abrirlo o cerrarlo.
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
                    <View style={styles.finishTitleRow}>
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
                    </View>

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

      {isRestRunning || restFinished ? (
        <TouchableRipple
          borderless
          onPress={handlePressFloatingRestTimer}
          style={[
            styles.floatingRestTimer,
            {
              backgroundColor: restFinished
                ? successColor
                : theme.colors.surface,
              borderColor: restFinished ? successColor : premiumBorder,
            },
          ]}
        >
          <View style={styles.floatingTimerContent}>
            <IconButton
              icon={restFinished ? "check-circle-outline" : "timer-sand"}
              size={20}
              iconColor={
                restFinished ? theme.colors.onPrimary : theme.colors.primary
              }
              style={styles.floatingTimerIcon}
            />

            <Text
              variant="labelLarge"
              style={{
                color: restFinished
                  ? theme.colors.onPrimary
                  : theme.colors.primary,
                fontWeight: "900",
              }}
            >
              {restFinished ? "Listo" : formatTime(restRemainingSeconds)}
            </Text>
          </View>
        </TouchableRipple>
      ) : null}

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
            Si cerrás este panel o salís de la app, el tiempo sigue corriendo.
          </Text>

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
              style={[styles.timerSecondaryButton, { borderColor: premiumBorder }]}
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

        <Modal
          visible={restTimerVisible}
          onDismiss={handleCloseRestTimer}
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
                backgroundColor: restFinished ? successSoft : softPrimary,
              },
            ]}
          >
            <IconButton
              icon={restFinished ? "check-circle-outline" : "timer-sand"}
              size={28}
              iconColor={restFinished ? successColor : theme.colors.primary}
              style={styles.timerIcon}
            />
          </View>

          <Text
            variant="titleLarge"
            style={{
              color: theme.colors.onSurface,
              fontWeight: "900",
              textAlign: "center",
            }}
          >
            {restFinished ? "Descanso terminado" : "Descanso"}
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
            {restExercise?.name || "Ejercicio"} · {restDurationSeconds}s
          </Text>

          <Text
            variant="displayLarge"
            style={[
              styles.bigTimer,
              {
                color: restFinished ? successColor : theme.colors.primary,
              },
            ]}
          >
            {restFinished ? "LISTO" : formatTime(restRemainingSeconds)}
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              color: restFinished
                ? successColor
                : theme.colors.onSurfaceVariant,
              textAlign: "center",
              fontWeight: restFinished ? "900" : "600",
              marginBottom: 18,
            }}
          >
            {restFinished
              ? "Ya podés empezar la próxima serie."
              : "Respirá y preparate para la siguiente serie."}
          </Text>

          <View style={styles.timerActions}>
            <Button
              mode="contained"
              icon="restart"
              style={styles.timerMainButton}
              contentStyle={styles.timerButtonContent}
              onPress={handleRestartRestTimer}
            >
              Reiniciar
            </Button>

            <Button
              mode="outlined"
              icon={restFinished ? "close" : "stop"}
              style={[styles.timerSecondaryButton, { borderColor: premiumBorder }]}
              contentStyle={styles.timerButtonContent}
              onPress={restFinished ? handleClearRestTimer : handleStopRestTimer}
            >
              {restFinished ? "Cerrar" : "Detener"}
            </Button>
          </View>

          <Button
            mode="text"
            icon="close"
            style={styles.timerCloseButton}
            onPress={handleCloseRestTimer}
          >
            Ocultar
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

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
          pointerEvents="box-none"
          style={styles.dialogKeyboardAvoiding}
        >
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
            <View style={styles.exerciseDialogHeader}>
              <View
                style={[
                  styles.exerciseDialogIconBox,
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
                    size={26}
                    iconColor={theme.colors.primary}
                    style={styles.exerciseDialogIcon}
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
                {isEditing ? "Editar ejercicio" : "Nuevo ejercicio"}
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
                Cargá series, repeticiones, peso, descanso y notas.
              </Text>
            </View>

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
                    style={{
                      color: theme.colors.onErrorContainer,
                      fontWeight: "700",
                    }}
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
                onPress={handleSaveExercise}
                style={styles.dialogActionButton}
                contentStyle={styles.dialogActionContent}
              >
                Guardar
              </Button>
            </View>
          </Dialog>
        </KeyboardAvoidingView>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 165,
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

  emptyContent: {
    alignItems: "center",
    paddingVertical: 10,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    alignSelf: "center",
  },

  emptyIconButton: {
    width: 72,
    height: 72,
    margin: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.3,
  },

  emptyText: {
    lineHeight: 21,
    textAlign: "center",
  },

  emptyButton: {
    borderRadius: 18,
    marginTop: 22,
    alignSelf: "stretch",
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

  sectionHeaderText: {
    flex: 1,
    marginRight: 12,
  },

  exerciseCard: {
    borderRadius: 28,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },

  exerciseAccordionHeader: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  exerciseTopActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  exerciseHeaderInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },

  completeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    paddingHorizontal: 10,
  },

  accordionChevron: {
    width: 34,
    height: 34,
    margin: 0,
    marginLeft: 2,
  },

  exerciseMetaRowCompact: {
    marginTop: 10,
    marginLeft: 54,
    flexDirection: "row",
    alignItems: "center",
  },

  exerciseCardContent: {
    paddingTop: 0,
    paddingBottom: 16,
  },

  exerciseActionsPanel: {
    marginTop: 2,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  exerciseActionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  exerciseActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  smallActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 0,
  },

  inlineIcon: {
    margin: 0,
  },

  completedPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingRight: 12,
    paddingLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  completedPillIcon: {
    width: 24,
    height: 24,
    margin: 0,
    marginRight: 2,
  },

  setsBox: {
    marginTop: 2,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },

  setsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  setsHeaderText: {
    flex: 1,
    marginRight: 8,
  },

  setsProgressBar: {
    height: 8,
    borderRadius: 999,
    marginBottom: 12,
  },

  setButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  setButton: {
    minWidth: 48,
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },

  setButtonContent: {
    minHeight: 42,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  setButtonIcon: {
    width: 22,
    height: 22,
    margin: 0,
    marginRight: 3,
  },

  restButtonTouchable: {
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    overflow: "hidden",
  },

  restButtonPremiumContent: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  restButtonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  restButtonIcon: {
    margin: 0,
  },

  restButtonTextBox: {
    flex: 1,
    minWidth: 0,
  },

  restButtonArrow: {
    margin: 0,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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

  finishTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  finishIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
    shadowOffset: { width: 0, height: 5 },
    overflow: "hidden",
  },

  floatingRestTimer: {
    position: "absolute",
    right: 18,
    bottom: 174,
    borderRadius: 999,
    borderWidth: 1,
    elevation: 5,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
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

  bigTimer: {
    fontWeight: "900",
    textAlign: "center",
    marginTop: 22,
    marginBottom: 10,
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

  dialogKeyboardAvoiding: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },

  premiumDialog: {
    borderRadius: 30,
    overflow: "hidden",
    marginHorizontal: 18,
  },

  exerciseDialog: {
    maxHeight: "86%",
    alignSelf: "center",
    width: "91%",
  },

  exerciseDialogHeader: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 10,
    alignItems: "center",
  },

  exerciseDialogIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  exerciseDialogIcon: {
    margin: 0,
  },

  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
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

  dialogErrorBox: {
    borderRadius: 16,
    padding: 12,
    marginTop: 2,
  },

  dialogActionsCustom: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 18,
  },

  dialogActionButton: {
    flex: 1,
    borderRadius: 16,
  },

  dialogActionContent: {
    height: 48,
  },
});