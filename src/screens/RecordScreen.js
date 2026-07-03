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
  Chip,
  Dialog,
  IconButton,
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

  const dangerSoft = theme.dark
    ? "rgba(248,113,113,0.12)"
    : "rgba(220,38,38,0.07)";

  const dangerColor = theme.dark ? "#FCA5A5" : "#B91C1C";

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

      if (!shareComment.trim()) {
        Alert.alert(
          "Comentario vacío",
          "Escribí un comentario para compartir tu progreso."
        );
        return;
      }

      const { userName, userPhotoURL } = getUserPostData();

      setSharing(true);

      if (shareType === "weekly") {
        await createProgressPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          text: shareComment.trim(),
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

        await createExerciseProgressPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          exercise: shareExercise,
          text: shareComment.trim(),
        });

        Alert.alert(
          "Logro compartido",
          `Publicaste tu progreso en ${shareExercise.name}.`
        );
      }

      setShareDialogVisible(false);
      setShareType(null);
      setShareExercise(null);
      setShareComment("");
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

    return "Compartir progreso";
  };

  const getShareDialogDescription = () => {
    if (shareType === "weekly") {
      return "Escribí un mensaje para publicar tu resumen semanal en Social.";
    }

    if (shareType === "exercise") {
      return "Escribí un mensaje para publicar tu evolución en este ejercicio.";
    }

    return "Escribí un mensaje para acompañar tu publicación.";
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
              icon="chart-line"
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
              FORTE RECORD
            </Text>
          </View>

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
              style={[
                styles.card,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.weekTop}>
                  <View style={styles.weekTextBox}>
                    <View
                      style={[
                        styles.cardIconBox,
                        {
                          backgroundColor: softPrimary,
                        },
                      ]}
                    >
                      <IconButton
                        icon="calendar-check"
                        size={20}
                        iconColor={theme.colors.primary}
                        style={styles.cardIcon}
                      />
                    </View>

                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
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
                    {
                      backgroundColor: theme.dark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
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
                              : mutedSurface,
                            borderColor: day.trained
                              ? theme.colors.primary
                              : premiumBorder,
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.weekMessageBox,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      lineHeight: 21,
                    }}
                  >
                    {stats.weeklyMessage}
                  </Text>
                </View>

                <Button
                  mode="contained"
                  icon="share-variant-outline"
                  loading={sharing && shareType === "weekly"}
                  disabled={
                    sharing || (Number(stats.weeklyTrainedDays) || 0) <= 0
                  }
                  style={styles.shareButton}
                  contentStyle={styles.shareButtonContent}
                  onPress={openWeeklyShareDialog}
                >
                  Compartir progreso
                </Button>
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
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Comparación semanal
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                      }}
                    >
                      Esta semana contra la semana anterior.
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
                      icon="compare-horizontal"
                      size={19}
                      iconColor={theme.colors.primary}
                      style={styles.sectionIcon}
                    />
                  </View>
                </View>

                <View style={styles.comparisonGrid}>
                  <View
                    style={[
                      styles.comparisonItem,
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
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
                            ? successColor
                            : dangerColor,
                        fontWeight: "900",
                      }}
                    >
                      {formatDiff({ value: stats.comparison.workoutsDiff })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.comparisonItem,
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
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
                            ? successColor
                            : dangerColor,
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
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
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
                            ? successColor
                            : dangerColor,
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
              style={[
                styles.card,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Volumen por día
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                        lineHeight: 21,
                      }}
                    >
                      Visualizá qué días moviste más carga esta semana.
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
                      icon="chart-bar"
                      size={19}
                      iconColor={theme.colors.primary}
                      style={styles.sectionIcon}
                    />
                  </View>
                </View>

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
              style={[
                styles.card,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Progreso por ejercicio
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                        lineHeight: 21,
                      }}
                    >
                      Compará tu primera marca con la última y compartí tus
                      mejores avances.
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
                      icon="dumbbell"
                      size={19}
                      iconColor={theme.colors.primary}
                      style={styles.sectionIcon}
                    />
                  </View>
                </View>

                {topExerciseProgress.length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
                    ]}
                  >
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

                    const statusColor = isDown
                      ? dangerColor
                      : isImproved
                      ? successColor
                      : theme.colors.onSurfaceVariant;

                    const statusBackground = isDown
                      ? dangerSoft
                      : isImproved
                      ? successSoft
                      : theme.dark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(15,23,42,0.05)";

                    return (
                      <View
                        key={exercise.key}
                        style={[
                          styles.exerciseProgressItem,
                          {
                            borderColor: premiumBorder,
                            backgroundColor: premiumSurface,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.exerciseAccentLine,
                            {
                              backgroundColor: isDown
                                ? dangerColor
                                : isImproved
                                ? successColor
                                : theme.colors.primary,
                            },
                          ]}
                        />

                        <View style={styles.exerciseProgressHeader}>
                          <View
                            style={[
                              styles.exerciseIconBox,
                              {
                                backgroundColor: softPrimary,
                              },
                            ]}
                          >
                            <IconButton
                              icon="dumbbell"
                              size={18}
                              iconColor={theme.colors.primary}
                              style={styles.exerciseIcon}
                            />
                          </View>

                          <View style={styles.exerciseProgressTitleBox}>
                            <Text
                              variant="titleMedium"
                              numberOfLines={2}
                              style={{
                                color: theme.colors.onSurface,
                                fontWeight: "900",
                                lineHeight: 22,
                              }}
                            >
                              {exercise.name}
                            </Text>

                            <Text
                              variant="bodySmall"
                              style={{
                                color: theme.colors.onSurfaceVariant,
                                marginTop: 3,
                                lineHeight: 18,
                              }}
                            >
                              {exercise.completedCount} registros ·{" "}
                              {formatNumber(exercise.totalVolume)} kg acumulados
                            </Text>
                          </View>

                          <Chip
                            compact
                            style={[
                              styles.exerciseChip,
                              {
                                backgroundColor: statusBackground,
                              },
                            ]}
                            textStyle={{
                              color: statusColor,
                              fontWeight: "900",
                            }}
                          >
                            {getExerciseStatusLabel(exercise)}
                          </Chip>
                        </View>

                        <View style={styles.exerciseMetricsRow}>
                          <View
                            style={[
                              styles.exerciseMetric,
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

                        <View
                          style={[
                            styles.exerciseResultBox,
                            {
                              backgroundColor: mutedSurface,
                              borderColor: premiumBorder,
                            },
                          ]}
                        >
                          <View style={styles.exerciseResultTop}>
                            <View>
                              <Text
                                variant="labelSmall"
                                style={{
                                  color: theme.colors.onSurfaceVariant,
                                  fontWeight: "900",
                                  letterSpacing: 0.5,
                                }}
                              >
                                EVOLUCIÓN
                              </Text>

                              <Text
                                variant="headlineSmall"
                                style={{
                                  color: statusColor,
                                  fontWeight: "900",
                                  marginTop: 1,
                                  letterSpacing: -0.4,
                                }}
                              >
                                {formatDiff({
                                  value: exercise.progressWeight,
                                  suffix: "kg",
                                })}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.exerciseResultBadge,
                                {
                                  backgroundColor: statusBackground,
                                },
                              ]}
                            >
                              <IconButton
                                icon={
                                  isDown
                                    ? "trending-down"
                                    : isImproved
                                    ? "trending-up"
                                    : "minus"
                                }
                                size={18}
                                iconColor={statusColor}
                                style={styles.exerciseResultIcon}
                              />
                            </View>
                          </View>

                          <Button
                            mode="contained"
                            icon="share-variant-outline"
                            loading={sharingExerciseId === exercise.key}
                            disabled={!!sharingExerciseId || sharing}
                            buttonColor={theme.colors.primary}
                            textColor={theme.colors.onPrimary}
                            style={styles.exerciseShareButton}
                            contentStyle={styles.exerciseShareButtonContent}
                            labelStyle={styles.exerciseShareButtonLabel}
                            onPress={() => openExerciseShareDialog(exercise)}
                          >
                            Compartir progreso
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
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
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
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
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
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
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
                  {
                    backgroundColor: premiumSurface,
                    borderColor: premiumBorder,
                  },
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
              style={[
                styles.card,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Historial
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                      }}
                    >
                      Últimos entrenamientos finalizados.
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
                      icon="history"
                      size={19}
                      iconColor={theme.colors.primary}
                      style={styles.sectionIcon}
                    />
                  </View>
                </View>

                {(stats.parsedSessions || []).length === 0 ? (
                  <View
                    style={[
                      styles.emptyBox,
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
                    ]}
                  >
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
                        {
                          borderColor: premiumBorder,
                          backgroundColor: mutedSurface,
                        },
                      ]}
                    >
                      <View style={styles.sessionTopRow}>
                        <View style={styles.sessionInfo}>
                          <Text
                            variant="titleMedium"
                            numberOfLines={2}
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "900",
                              lineHeight: 22,
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          pointerEvents="box-none"
          style={styles.keyboardAvoidingView}
        >
          <Dialog
            visible={shareDialogVisible}
            onDismiss={closeShareDialog}
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
                {sharing ? (
                  <ActivityIndicator size={24} color={theme.colors.primary} />
                ) : (
                  <IconButton
                    icon="share-variant-outline"
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
                {getShareDialogTitle()}
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
                {getShareDialogDescription()}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.shareDialogContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                mode="outlined"
                label="Comentario"
                value={shareComment}
                onChangeText={setShareComment}
                multiline
                numberOfLines={5}
                placeholder={
                  shareType === "weekly"
                    ? "Ej: Buena semana, cada vez más constante 💪"
                    : "Ej: Hoy pude mejorar mi marca y seguir progresando 💪"
                }
                outlineStyle={{ borderRadius: 16 }}
              />

              <View
                style={[
                  styles.shareHintBox,
                  {
                    backgroundColor: mutedSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <IconButton
                  icon="information-outline"
                  size={18}
                  iconColor={theme.colors.primary}
                  style={styles.shareHintIcon}
                />

                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  Este texto se publicará junto con tus datos de progreso en la
                  sección Social.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.dialogActionsCustom}>
              <Button
                mode="outlined"
                disabled={sharing}
                onPress={closeShareDialog}
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
                icon="send"
                loading={sharing}
                disabled={sharing}
                onPress={handleConfirmShare}
                style={styles.dialogActionButton}
                contentStyle={styles.dialogActionContent}
              >
                Publicar
              </Button>
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
    paddingBottom: 130,
  },

  header: {
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
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 1,
  },

  cardContent: {
    paddingVertical: 18,
  },

  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  cardIcon: {
    margin: 0,
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

  weekMessageBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },

  shareButton: {
    borderRadius: 18,
    marginTop: 16,
  },

  shareButtonContent: {
    height: 52,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  sectionTextBox: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  sectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  sectionIcon: {
    margin: 0,
  },

  comparisonGrid: {
    flexDirection: "row",
    gap: 10,
  },

  comparisonItem: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },

  exerciseProgressItem: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 14,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
  },

  exerciseAccentLine: {
    position: "absolute",
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },

  exerciseProgressHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 4,
  },

  exerciseIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },

  exerciseIcon: {
    margin: 0,
  },

  exerciseProgressTitleBox: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },

  exerciseChip: {
    flexShrink: 0,
    alignSelf: "flex-start",
  },

  exerciseMetricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  exerciseMetric: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },

  exerciseResultBox: {
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },

  exerciseResultTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  exerciseResultBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  exerciseResultIcon: {
    margin: 0,
  },

  exerciseShareButton: {
    borderRadius: 17,
  },

  exerciseShareButtonContent: {
    height: 46,
  },

  exerciseShareButtonLabel: {
    fontWeight: "900",
    letterSpacing: 0.1,
  },

  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
  },

  statNumber: {
    fontWeight: "900",
  },

  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },

  sessionItem: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
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

  shareDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
  },

  shareHintBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingRight: 12,
    marginTop: 14,
  },

  shareHintIcon: {
    margin: 0,
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
});