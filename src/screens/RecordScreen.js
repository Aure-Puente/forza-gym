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
  Chip,
  Dialog,
  Portal,
  ProgressBar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import ProgressDonut from "../components/charts/ProgressDonut";
import WeeklyBars from "../components/charts/WeeklyBars";

import { useAuth } from "../context/AuthContext";

import {
  buildRecordStats,
  getWorkoutSessions,
} from "../services/recordsService";

import { getTrainingDays } from "../services/trainingDaysService";

import {
  createExerciseProgressPost,
  createProgressPost,
} from "../services/postsService";

const formatDuration = (totalSeconds) => {
  const seconds = Number(totalSeconds) || 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
};

const formatDiff = ({ value, suffix = "" }) => {
  const numberValue = Number(value) || 0;

  if (numberValue > 0) {
    return `+${formatNumber(numberValue)}${suffix}`;
  }

  if (numberValue < 0) {
    return `${formatNumber(numberValue)}${suffix}`;
  }

  return `0${suffix}`;
};

const formatSessionDate = (date) => {
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
};

const getExerciseStatusLabel = (exercise) => {
  if ((Number(exercise?.progressWeight) || 0) > 0) {
    return "Mejoró";
  }

  if ((Number(exercise?.progressWeight) || 0) < 0) {
    return "Bajó";
  }

  return "Constante";
};

export default function RecordScreen() {
  const theme = useTheme();
  const { user, userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [trainingDaysCount, setTrainingDaysCount] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sharing, setSharing] = useState(false);
  const [sharingExerciseId, setSharingExerciseId] = useState(null);

  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [shareType, setShareType] = useState(null);
  const [shareExercise, setShareExercise] = useState(null);
  const [shareComment, setShareComment] = useState("");

  const [error, setError] = useState("");

  const weeklyGoalDays = Math.max(1, trainingDaysCount);

  const stats = useMemo(() => {
    return buildRecordStats({
      sessions,
      weeklyGoalDays,
    });
  }, [sessions, weeklyGoalDays]);

  const topExerciseProgress = useMemo(() => {
    return (stats?.exerciseProgress || []).slice(0, 6);
  }, [stats?.exerciseProgress]);

  const loadData = useCallback(async () => {
    try {
      setError("");

      if (!user?.uid) return;

      const [sessionsResponse, trainingDaysResponse] = await Promise.all([
        getWorkoutSessions({
          uid: user.uid,
          maxResults: 80,
        }),
        getTrainingDays(user.uid),
      ]);

      setSessions(Array.isArray(sessionsResponse) ? sessionsResponse : []);
      setTrainingDaysCount(
        Math.max(
          1,
          Array.isArray(trainingDaysResponse) ? trainingDaysResponse.length : 1
        )
      );
    } catch (err) {
      setError(err?.message || "No se pudo cargar tu registro.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const getUserPostData = () => {
    return {
      userName: userProfile?.name || user?.displayName || "Usuario Forte",
      userPhotoURL: userProfile?.photoURL || user?.photoURL || null,
    };
  };

  const getDefaultWeeklyText = () => {
    const weeklyTrainedDays = Number(stats.weeklyTrainedDays) || 0;
    const weeklyGoalDaysValue = Number(stats.weeklyGoalDays) || weeklyGoalDays;
    const weeklyVolume = Number(stats.weeklyVolume) || 0;
    const weeklyCompletedExercises =
      Number(stats.weeklyCompletedExercises) || 0;

    if (weeklyTrainedDays >= weeklyGoalDaysValue) {
      return `Cumplí mi rutina semanal: ${weeklyTrainedDays}/${weeklyGoalDaysValue} entrenamientos, ${formatNumber(
        weeklyVolume
      )} kg de volumen y ${weeklyCompletedExercises} ejercicios completados. 💪`;
    }

    return `Esta semana voy ${weeklyTrainedDays}/${weeklyGoalDaysValue} entrenamientos, ${formatNumber(
      weeklyVolume
    )} kg de volumen y ${weeklyCompletedExercises} ejercicios completados. 💪`;
  };

  const getDefaultExerciseText = (exercise) => {
    const progressWeight = Number(exercise?.progressWeight) || 0;
    const bestWeight = Number(exercise?.bestWeight) || 0;
    const lastWeight = Number(exercise?.lastWeight) || 0;

    if (progressWeight > 0) {
      return `Mejoré ${progressWeight} kg en ${exercise.name}. Mi mejor marca ahora es ${bestWeight} kg 💪`;
    }

    if (progressWeight < 0) {
      return `Estoy siguiendo mi evolución en ${exercise.name}. Última marca: ${lastWeight} kg 💪`;
    }

    return `Me mantengo constante en ${exercise.name}. Última marca: ${lastWeight} kg 💪`;
  };

  const openWeeklyShareDialog = () => {
    if (!user?.uid) {
      Alert.alert("Error", "No se encontró el usuario.");
      return;
    }

    if ((Number(stats.weeklyTrainedDays) || 0) <= 0) {
      Alert.alert(
        "Sin progreso semanal",
        "Todavía no tenés entrenamientos esta semana para compartir."
      );
      return;
    }

    setShareType("weekly");
    setShareExercise(null);
    setShareComment("");
    setShareDialogVisible(true);
  };

  const openExerciseShareDialog = (exercise) => {
    if (!user?.uid) {
      Alert.alert("Error", "No se encontró el usuario.");
      return;
    }

    if (!exercise?.name) {
      Alert.alert("Sin ejercicio", "No se encontró el ejercicio.");
      return;
    }

    setShareType("exercise");
    setShareExercise(exercise);
    setShareComment("");
    setShareDialogVisible(true);
  };

  const closeShareDialog = () => {
    if (sharing) return;

    setShareDialogVisible(false);
    setShareType(null);
    setShareExercise(null);
    setShareComment("");
  };

  const handleConfirmShare = async () => {
    try {
      if (!user?.uid) {
        Alert.alert("Error", "No se encontró el usuario.");
        return;
      }

      const { userName, userPhotoURL } = getUserPostData();

      setSharing(true);

      if (shareType === "weekly") {
        const finalText = shareComment.trim()
          ? shareComment.trim()
          : getDefaultWeeklyText();

        await createProgressPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          text: finalText,
          stats: {
            weeklyGoalDays: Number(stats.weeklyGoalDays) || weeklyGoalDays,
            weeklyTrainedDays: Number(stats.weeklyTrainedDays) || 0,
            weeklyProgress: Number(stats.weeklyProgress) || 0,
            weeklyVolume: Number(stats.weeklyVolume) || 0,
            weeklyCompletedExercises:
              Number(stats.weeklyCompletedExercises) || 0,
            weeklyDurationSeconds: Number(stats.weeklyDurationSeconds) || 0,
            totalWorkouts: Number(stats.totalWorkouts) || 0,
            totalVolume: Number(stats.totalVolume) || 0,
          },
        });

        Alert.alert(
          "Progreso compartido",
          "Tu resumen semanal se publicó en Social."
        );
      }

      if (shareType === "exercise") {
        if (!shareExercise?.name) {
          Alert.alert("Sin ejercicio", "No se encontró el ejercicio.");
          return;
        }

        setSharingExerciseId(shareExercise.key);

        const finalText = shareComment.trim()
          ? shareComment.trim()
          : getDefaultExerciseText(shareExercise);

        await createExerciseProgressPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          exercise: shareExercise,
          text: finalText,
        });

        Alert.alert(
          "Logro compartido",
          `Publicaste tu progreso en ${shareExercise.name}.`
        );
      }

      closeShareDialog();
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "No se pudo compartir la publicación."
      );
    } finally {
      setSharing(false);
      setSharingExerciseId(null);
    }
  };

  const getShareDialogTitle = () => {
    if (shareType === "weekly") {
      return "Compartir progreso semanal";
    }

    if (shareType === "exercise") {
      return `Compartir ${shareExercise?.name || "ejercicio"}`;
    }

    return "Compartir";
  };

  const getSharePreviewText = () => {
    if (shareComment.trim()) {
      return shareComment.trim();
    }

    if (shareType === "weekly") {
      return getDefaultWeeklyText();
    }

    if (shareType === "exercise" && shareExercise) {
      return getDefaultExerciseText(shareExercise);
    }

    return "";
  };

  return (
    <>
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
          Registro
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Historial, asistencia y evolución de tus entrenamientos.
        </Text>

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
              Cargando registro...
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

            <Card
              mode="contained"
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <View style={styles.weekTop}>
                  <View style={styles.weekTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      Rutina semanal
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 5,
                        lineHeight: 21,
                      }}
                    >
                      {stats.weeklyTrainedDays} de {stats.weeklyGoalDays} días
                      completados según tus días creados en Entreno.
                    </Text>
                  </View>

                  <ProgressDonut
                    progress={stats.weeklyProgress}
                    size={118}
                    strokeWidth={12}
                    label={`${stats.weeklyProgress}%`}
                    subLabel="Semana"
                  />
                </View>

                <ProgressBar
                  progress={stats.weeklyProgress / 100}
                  color={theme.colors.primary}
                  style={[
                    styles.progressBar,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />

                <View style={styles.weekDaysRow}>
                  {(stats.weekMap || []).map((day) => (
                    <View key={day.dateKey} style={styles.weekDayItem}>
                      <Text
                        variant="labelMedium"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontWeight: "800",
                        }}
                      >
                        {day.label}
                      </Text>

                      <View
                        style={[
                          styles.weekDot,
                          {
                            backgroundColor: day.trained
                              ? theme.colors.primary
                              : theme.colors.surfaceVariant,
                            borderColor: day.trained
                              ? theme.colors.primary
                              : theme.colors.outline,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginTop: 16,
                    lineHeight: 21,
                  }}
                >
                  {stats.weeklyMessage}
                </Text>

                <Button
                  mode="contained-tonal"
                  icon="share-variant-outline"
                  loading={sharing && shareType === "weekly"}
                  disabled={
                    sharing || (Number(stats.weeklyTrainedDays) || 0) <= 0
                  }
                  style={styles.shareButton}
                  contentStyle={styles.buttonContent}
                  onPress={openWeeklyShareDialog}
                >
                  Compartir progreso
                </Button>
              </Card.Content>
            </Card>

            <Card
              mode="contained"
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Comparación semanal
                </Text>

                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 16,
                  }}
                >
                  Esta semana contra la semana anterior.
                </Text>

                <View style={styles.comparisonGrid}>
                  <View
                    style={[
                      styles.comparisonItem,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      Días
                    </Text>

                    <Text
                      variant="titleLarge"
                      style={{
                        color:
                          stats.comparison.workoutsDiff >= 0
                            ? theme.custom.success
                            : theme.colors.error,
                        fontWeight: "900",
                      }}
                    >
                      {formatDiff({ value: stats.comparison.workoutsDiff })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.comparisonItem,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      Volumen
                    </Text>

                    <Text
                      variant="titleLarge"
                      style={{
                        color:
                          stats.comparison.volumeDiff >= 0
                            ? theme.custom.success
                            : theme.colors.error,
                        fontWeight: "900",
                      }}
                    >
                      {formatDiff({
                        value: stats.comparison.volumeDiff,
                        suffix: "kg",
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.comparisonItem,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      Ejercicios
                    </Text>

                    <Text
                      variant="titleLarge"
                      style={{
                        color:
                          stats.comparison.exercisesDiff >= 0
                            ? theme.custom.success
                            : theme.colors.error,
                        fontWeight: "900",
                      }}
                    >
                      {formatDiff({
                        value: stats.comparison.exercisesDiff,
                      })}
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
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Volumen por día
                </Text>

                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 16,
                  }}
                >
                  Visualizá qué días moviste más carga esta semana.
                </Text>

                <WeeklyBars
                  data={stats.weekMap || []}
                  valueKey="volume"
                  maxHeight={96}
                  labelSuffix="Volumen semanal por día"
                />
              </Card.Content>
            </Card>

            <Card
              mode="contained"
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 4,
                  }}
                >
                  Progreso por ejercicio
                </Text>

                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    marginBottom: 16,
                    lineHeight: 21,
                  }}
                >
                  Compará tu primera marca registrada con la última y detectá
                  qué ejercicios vienen mejorando.
                </Text>

                {topExerciseProgress.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text
                      variant="titleMedium"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Todavía no hay progreso por ejercicio
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 8,
                        textAlign: "center",
                        lineHeight: 21,
                      }}
                    >
                      Finalizá entrenamientos con ejercicios completados para
                      empezar a ver tu evolución.
                    </Text>
                  </View>
                ) : (
                  topExerciseProgress.map((exercise) => {
                    const isImproved = exercise.progressWeight > 0;
                    const isDown = exercise.progressWeight < 0;

                    return (
                      <View
                        key={exercise.key}
                        style={[
                          styles.exerciseProgressItem,
                          { borderColor: theme.colors.outlineVariant },
                        ]}
                      >
                        <View style={styles.exerciseProgressHeader}>
                          <View style={styles.exerciseProgressTitleBox}>
                            <Text
                              variant="titleMedium"
                              numberOfLines={1}
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.name}
                            </Text>

                            <Text
                              variant="bodySmall"
                              style={{
                                color: theme.colors.onSurfaceVariant,
                                marginTop: 3,
                              }}
                            >
                              {exercise.completedCount} registros ·{" "}
                              {formatNumber(exercise.totalVolume)} kg
                              acumulados
                            </Text>
                          </View>

                          <Chip
                            compact
                            style={{
                              backgroundColor: isImproved
                                ? theme.custom.softPrimary
                                : theme.colors.surfaceVariant,
                            }}
                            textStyle={{
                              color: isDown
                                ? theme.colors.error
                                : isImproved
                                ? theme.colors.primary
                                : theme.colors.onSurfaceVariant,
                              fontWeight: "800",
                            }}
                          >
                            {getExerciseStatusLabel(exercise)}
                          </Chip>
                        </View>

                        <View style={styles.exerciseMetricsRow}>
                          <View
                            style={[
                              styles.exerciseMetric,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                          >
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Primera
                            </Text>

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.firstWeight}kg
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.exerciseMetric,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                          >
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Última
                            </Text>

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.lastWeight}kg
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.exerciseMetric,
                              { backgroundColor: theme.colors.surfaceVariant },
                            ]}
                          >
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Mejor
                            </Text>

                            <Text
                              variant="titleMedium"
                              style={{
                                color: theme.colors.primary,
                                fontWeight: "900",
                              }}
                            >
                              {exercise.bestWeight}kg
                            </Text>
                          </View>
                        </View>

                        <View style={styles.exerciseProgressFooter}>
                          <Text
                            variant="bodyMedium"
                            style={{
                              color: isDown
                                ? theme.colors.error
                                : isImproved
                                ? theme.custom.success
                                : theme.colors.onSurfaceVariant,
                              fontWeight: "800",
                            }}
                          >
                            {formatDiff({
                              value: exercise.progressWeight,
                              suffix: "kg",
                            })}
                          </Text>

                          <Button
                            mode="text"
                            compact
                            icon="share-variant-outline"
                            loading={sharingExerciseId === exercise.key}
                            disabled={!!sharingExerciseId || sharing}
                            onPress={() => openExerciseShareDialog(exercise)}
                          >
                            Compartir
                          </Button>
                        </View>
                      </View>
                    );
                  })
                )}
              </Card.Content>
            </Card>

            <View style={styles.grid}>
              <Card
                mode="contained"
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <Text
                    variant="headlineSmall"
                    style={[styles.statNumber, { color: theme.colors.primary }]}
                  >
                    {stats.totalWorkouts}
                  </Text>

                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Entrenos
                  </Text>
                </Card.Content>
              </Card>

              <Card
                mode="contained"
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <Text
                    variant="headlineSmall"
                    style={[styles.statNumber, { color: theme.colors.primary }]}
                  >
                    {formatNumber(stats.totalVolume)}
                  </Text>

                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Kg volumen
                  </Text>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.grid}>
              <Card
                mode="contained"
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <Text
                    variant="headlineSmall"
                    style={[styles.statNumber, { color: theme.colors.primary }]}
                  >
                    {formatDuration(stats.totalDurationSeconds)}
                  </Text>

                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Tiempo total
                  </Text>
                </Card.Content>
              </Card>

              <Card
                mode="contained"
                style={[
                  styles.statCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <Text
                    variant="headlineSmall"
                    style={[styles.statNumber, { color: theme.colors.primary }]}
                  >
                    {stats.totalCompletedExercises}
                  </Text>

                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Ejercicios
                  </Text>
                </Card.Content>
              </Card>
            </View>

            <Card
              mode="contained"
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 14,
                  }}
                >
                  Historial
                </Text>

                {(stats.parsedSessions || []).length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text
                      variant="titleMedium"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        textAlign: "center",
                      }}
                    >
                      Todavía no hay entrenamientos guardados
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 8,
                        textAlign: "center",
                        lineHeight: 21,
                      }}
                    >
                      Cuando finalices un entrenamiento desde el botón Finalizar
                      entrenamiento, aparecerá en tu registro.
                    </Text>
                  </View>
                ) : (
                  stats.parsedSessions.map((session) => (
                    <View
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        { borderColor: theme.colors.outlineVariant },
                      ]}
                    >
                      <View style={styles.sessionTopRow}>
                        <View style={styles.sessionInfo}>
                          <Text
                            variant="titleMedium"
                            numberOfLines={1}
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "900",
                            }}
                          >
                            {session.dayName || "Entrenamiento"}
                          </Text>

                          <Text
                            variant="bodySmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 3,
                            }}
                          >
                            {formatSessionDate(session.createdDate)}
                          </Text>
                        </View>

                        <Text
                          variant="labelLarge"
                          style={{
                            color: theme.colors.primary,
                            fontWeight: "900",
                          }}
                        >
                          {formatDuration(session.durationSeconds)}
                        </Text>
                      </View>

                      <View style={styles.sessionStatsRow}>
                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {session.completedExercises || 0}/
                          {session.totalExercises || 0} ejercicios
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {formatNumber(session.totalVolume)} kg
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={shareDialogVisible}
          onDismiss={closeShareDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>{getShareDialogTitle()}</Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.shareDialogContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 12,
                  lineHeight: 21,
                }}
              >
                Escribí un comentario para acompañar la publicación. Si lo dejás
                vacío, usamos un resumen automático.
              </Text>

              <TextInput
                mode="outlined"
                label="Comentario"
                value={shareComment}
                onChangeText={setShareComment}
                multiline
                numberOfLines={4}
                placeholder="Ej: Buena semana, cada vez más constante 💪"
              />

              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  variant="labelLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 6,
                  }}
                >
                  Vista previa
                </Text>

                <Text
                  variant="bodyMedium"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    lineHeight: 21,
                  }}
                >
                  {getSharePreviewText()}
                </Text>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={sharing} onPress={closeShareDialog}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={sharing}
              disabled={sharing}
              onPress={handleConfirmShare}
            >
              Publicar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
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
  loadingBox: {
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    borderRadius: 20,
    marginBottom: 14,
  },
  card: {
    borderRadius: 28,
    marginBottom: 16,
  },
  weekTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekTextBox: {
    flex: 1,
    marginRight: 14,
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    marginTop: 18,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  weekDayItem: {
    alignItems: "center",
  },
  weekDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    marginTop: 8,
  },
  shareButton: {
    borderRadius: 18,
    marginTop: 18,
  },
  buttonContent: {
    height: 48,
  },
  comparisonGrid: {
    flexDirection: "row",
    gap: 10,
  },
  comparisonItem: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
  },
  exerciseProgressItem: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  exerciseProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseProgressTitleBox: {
    flex: 1,
    marginRight: 10,
  },
  exerciseMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  exerciseMetric: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  exerciseProgressFooter: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
  },
  statNumber: {
    fontWeight: "900",
  },
  emptyBox: {
    paddingVertical: 28,
  },
  sessionItem: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingBottom: 14,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  shareDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  previewBox: {
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
});