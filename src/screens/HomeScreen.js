//Importaciones:
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  IconButton,
  ProgressBar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import ProgressDonut from "../components/charts/ProgressDonut";

import { useAuth } from "../context/AuthContext";

import {
  buildRecordStats,
  getWorkoutSessions,
} from "../services/recordsService";

import { getTrainingDays } from "../services/trainingDaysService";
import { getPosts } from "../services/postsService";

import { getCurrentWeekWorkoutStats } from "../services/workoutSessionsService";

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
};

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

const formatSessionDate = (date) => {
  if (!date) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatPostDate = (date) => {
  if (!date) return "Ahora";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
};

const getGreetingIcon = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "weather-sunny";
  if (hour < 19) return "white-balance-sunny";

  return "weather-night";
};

const getInitial = (name) => {
  return String(name || "F").charAt(0).toUpperCase();
};

const getPostTypeData = (post) => {
  if (post.type === "weekly_progress") {
    return {
      label: "Progreso semanal",
      icon: "chart-line",
    };
  }

  if (post.type === "exercise_progress") {
    return {
      label: "Logro",
      icon: "dumbbell",
    };
  }

  if (post.type === "goal_completed") {
    return {
      label: "Objetivo cumplido",
      icon: "target",
    };
  }

  if (post.type === "photo") {
    return {
      label: "Foto",
      icon: "image-outline",
    };
  }

  return {
    label: "Publicación",
    icon: "message-text-outline",
  };
};

const getPostPreviewText = (post) => {
  if (post.text?.trim()) {
    return post.text.trim();
  }

  if (post.type === "weekly_progress") {
    return "Compartió su progreso semanal.";
  }

  if (post.type === "exercise_progress") {
    return "Compartió un avance de entrenamiento.";
  }

  if (post.type === "goal_completed") {
    return "Cumplió un objetivo.";
  }

  if (post.type === "photo") {
    return "Compartió una foto.";
  }

  return "Nueva publicación en Social.";
};

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [trainingDays, setTrainingDays] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [recentSocialPosts, setRecentSocialPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = userProfile?.name || user?.displayName || "Usuario Forte";
  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  const firstName = String(displayName || "Usuario").split(" ")[0];

  const weeklyGoalDays = Math.max(
    1,
    Number(weeklyStats?.weeklyGoal) || trainingDays.length || 1
  );

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

  const successColor = theme.dark ? "#86EFAC" : "#15803D";

  const stats = useMemo(() => {
    return buildRecordStats({
      sessions,
      weeklyGoalDays,
    });
  }, [sessions, weeklyGoalDays]);

  const weeklyView = useMemo(() => {
    const trainedDaysCount =
      Number(weeklyStats?.trainedDaysCount) ||
      Number(stats?.weeklyTrainedDays) ||
      0;

    const goal =
      Number(weeklyStats?.weeklyGoal) ||
      Number(stats?.weeklyGoalDays) ||
      weeklyGoalDays;

    const progressPercent =
      weeklyStats?.progressPercent !== undefined
        ? Number(weeklyStats.progressPercent) || 0
        : Math.min(100, Math.round((trainedDaysCount / goal) * 100));

    const completed = trainedDaysCount >= goal;

    let message = "Todavía no registraste entrenamientos esta semana.";

    if (completed) {
      message = "Semana completada. Buen trabajo, seguí manteniendo el ritmo.";
    } else if (trainedDaysCount > 0) {
      message = `Ya empezaste la semana. Te faltan ${Math.max(
        0,
        goal - trainedDaysCount
      )} día/s para cumplirla.`;
    } else if (!stats?.totalWorkouts) {
      message = "Armá tu rutina y empezá a registrar tus entrenamientos.";
    }

    return {
      trainedDaysCount,
      goal,
      progressPercent,
      completed,
      message,
      weeklyVolume:
        Number(weeklyStats?.totalVolume) || Number(stats?.weeklyVolume) || 0,
      weeklyCompletedExercises:
        Number(weeklyStats?.completedExercises) ||
        Number(stats?.weeklyCompletedExercises) ||
        0,
      weeklyDurationSeconds:
        Number(weeklyStats?.durationSeconds) ||
        Number(stats?.weeklyDurationSeconds) ||
        0,
      sessionsCount:
        Number(weeklyStats?.sessionsCount) || Number(stats?.weeklyWorkouts) || 0,
    };
  }, [weeklyStats, stats, weeklyGoalDays]);

  const lastSession = useMemo(() => {
    return stats?.parsedSessions?.[0] || null;
  }, [stats?.parsedSessions]);

  const nextTrainingDay = useMemo(() => {
    if (!trainingDays.length) return null;

    const todayIndex = new Date().getDay();
    const safeIndex = todayIndex === 0 ? 0 : todayIndex - 1;

    return trainingDays[safeIndex % trainingDays.length] || trainingDays[0];
  }, [trainingDays]);

  const bestExercise = useMemo(() => {
    const progress = stats?.exerciseProgress || [];

    if (progress.length === 0) return null;

    const improved = progress
      .filter((item) => Number(item.progressWeight) > 0)
      .sort((a, b) => Number(b.progressWeight) - Number(a.progressWeight));

    return improved[0] || progress[0];
  }, [stats?.exerciseProgress]);

  const weeklySubtitle = useMemo(() => {
    return weeklyView.message;
  }, [weeklyView.message]);

  const loadData = useCallback(async () => {
    try {
      if (!user?.uid) return;

      const [sessionsResponse, trainingDaysResponse, postsResponse] =
        await Promise.all([
          getWorkoutSessions({
            uid: user.uid,
            maxResults: 80,
          }),
          getTrainingDays(user.uid),
          getPosts({
            uid: user.uid,
            maxResults: 12,
          }),
        ]);

      const safeTrainingDays = Array.isArray(trainingDaysResponse)
        ? trainingDaysResponse
        : [];

      const safeWeeklyGoal = Math.max(1, safeTrainingDays.length || 1);

      const weekStatsResponse = await getCurrentWeekWorkoutStats({
        uid: user.uid,
        weeklyGoal: safeWeeklyGoal,
      });

      const safePosts = Array.isArray(postsResponse) ? postsResponse : [];

      setSessions(Array.isArray(sessionsResponse) ? sessionsResponse : []);
      setTrainingDays(safeTrainingDays);
      setWeeklyStats(weekStatsResponse || null);
      setRecentSocialPosts(
        safePosts.filter((post) => post.userId !== user.uid).slice(0, 2)
      );
    } catch (error) {
      console.log("Error cargando Home:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const goToTab = (screenName) => {
    navigation.navigate(screenName);
  };

  const goToWorkoutDay = () => {
    if (!nextTrainingDay?.id) {
      navigation.navigate("Entreno");
      return;
    }

    navigation.navigate("WorkoutDay", {
      dayId: nextTrainingDay.id,
      dayName: nextTrainingDay.name,
    });
  };

  const renderQuickAction = ({
    title,
    subtitle,
    icon,
    onPress,
    featured = false,
  }) => {
    return (
      <TouchableRipple
        borderless
        onPress={onPress}
        style={[
          styles.quickAction,
          {
            backgroundColor: featured ? softPrimary : mutedSurface,
            borderColor: featured ? theme.colors.primary : premiumBorder,
          },
        ]}
      >
        <View style={styles.quickActionContent}>
          <View
            style={[
              styles.quickIconBox,
              {
                backgroundColor: featured
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: featured ? theme.colors.primary : premiumBorder,
              },
            ]}
          >
            <IconButton
              icon={icon}
              size={22}
              iconColor={
                featured ? theme.colors.onPrimary : theme.colors.primary
              }
              style={styles.quickIcon}
            />
          </View>

          <View style={styles.quickTextBox}>
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
              }}
            >
              {title}
            </Text>

            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          </View>

          <IconButton
            icon="chevron-right"
            size={21}
            iconColor={
              featured ? theme.colors.primary : theme.colors.onSurfaceVariant
            }
            style={styles.quickArrow}
          />
        </View>
      </TouchableRipple>
    );
  };

  const renderSocialPostPreview = (post) => {
    const typeData = getPostTypeData(post);

    return (
      <TouchableRipple
        key={post.id}
        borderless
        onPress={() => goToTab("Social")}
        style={[
          styles.socialPreviewItem,
          {
            backgroundColor: mutedSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        <View style={styles.socialPreviewContent}>
          <View style={styles.socialPreviewTop}>
            {post.userPhotoURL ? (
              <Avatar.Image size={42} source={{ uri: post.userPhotoURL }} />
            ) : (
              <Avatar.Text
                size={42}
                label={getInitial(post.userName)}
                style={{ backgroundColor: softPrimary }}
                color={theme.colors.primary}
                labelStyle={{ fontWeight: "900" }}
              />
            )}

            <View style={styles.socialPreviewUserBox}>
              <Text
                variant="labelLarge"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                }}
              >
                {post.userName || "Usuario Forte"}
              </Text>

              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 2,
                }}
              >
                {formatPostDate(post.createdDate)}
              </Text>
            </View>

            {!!post.imageUrl ? (
              <Image
                source={{ uri: post.imageUrl }}
                style={styles.socialPreviewImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.socialPreviewMiniIcon,
                  {
                    backgroundColor: softPrimary,
                  },
                ]}
              >
                <IconButton
                  icon={typeData.icon}
                  size={18}
                  iconColor={theme.colors.primary}
                  style={styles.socialPreviewIcon}
                />
              </View>
            )}
          </View>

          <Text
            variant="bodyMedium"
            numberOfLines={2}
            style={{
              color: theme.colors.onSurfaceVariant,
              lineHeight: 20,
              marginTop: 10,
            }}
          >
            {getPostPreviewText(post)}
          </Text>

          <View style={styles.socialPreviewBottom}>
            <Chip
              compact
              icon={typeData.icon}
              style={{ backgroundColor: softPrimary }}
              textStyle={{
                color: theme.colors.primary,
                fontWeight: "900",
              }}
            >
              {typeData.label}
            </Chip>

            <Text
              variant="labelMedium"
              style={{
                color: theme.colors.primary,
                fontWeight: "900",
              }}
            >
              Ver en Social
            </Text>
          </View>
        </View>
      </TouchableRipple>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: premiumSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextBox}>
            <View
              style={[
                styles.greetingPill,
                {
                  backgroundColor: softPrimary,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <IconButton
                icon={getGreetingIcon()}
                size={15}
                iconColor={theme.colors.primary}
                style={styles.greetingIcon}
              />

              <Text
                variant="labelSmall"
                style={{
                  color: theme.colors.primary,
                  fontWeight: "900",
                  letterSpacing: 0.6,
                }}
              >
                {getGreeting().toUpperCase()}
              </Text>
            </View>

            <Text
              variant="headlineMedium"
              numberOfLines={1}
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              {firstName}
            </Text>

            <Text
              variant="bodyMedium"
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {weeklySubtitle}
            </Text>
          </View>

          <TouchableRipple
            borderless
            onPress={() => goToTab("Perfil")}
            style={styles.avatarTouchable}
          >
            <View
              style={[
                styles.avatarRing,
                {
                  backgroundColor: softPrimary,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              {photoURL ? (
                <Avatar.Image size={74} source={{ uri: photoURL }} />
              ) : (
                <Avatar.Text
                  size={74}
                  label={getInitial(displayName)}
                  style={{ backgroundColor: "transparent" }}
                  color={theme.colors.primary}
                  labelStyle={{ fontWeight: "900" }}
                />
              )}

              <View
                style={[
                  styles.avatarStatus,
                  {
                    backgroundColor: successColor,
                    borderColor: theme.colors.surface,
                  },
                ]}
              />
            </View>
          </TouchableRipple>
        </View>

        <View style={styles.headerBottomRow}>
          <View
            style={[
              styles.headerMiniStat,
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
              }}
            >
              ESTA SEMANA
            </Text>

            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.primary,
                fontWeight: "900",
                marginTop: 2,
              }}
            >
              {weeklyView.trainedDaysCount}/{weeklyView.goal}
            </Text>
          </View>

          <View
            style={[
              styles.headerMiniStat,
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
              }}
            >
              VOLUMEN
            </Text>

            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.primary,
                fontWeight: "900",
                marginTop: 2,
              }}
            >
              {formatNumber(weeklyView.weeklyVolume)} kg
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" />

          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginTop: 12,
            }}
          >
            Cargando inicio...
          </Text>
        </View>
      ) : (
        <>
          {recentSocialPosts.length > 0 && (
            <Card
              mode="contained"
              style={[
                styles.socialCard,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content>
                <View style={styles.socialHeader}>
                  <View style={styles.socialHeaderText}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                        letterSpacing: -0.3,
                      }}
                    >
                      Actividad social
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                      }}
                    >
                      Últimas publicaciones de otros usuarios.
                    </Text>
                  </View>

                  <Button
                    mode="text"
                    compact
                    icon="arrow-right"
                    textColor={theme.colors.primary}
                    onPress={() => goToTab("Social")}
                  >
                    Ver
                  </Button>
                </View>

                <View style={styles.socialPreviewList}>
                  {recentSocialPosts.map(renderSocialPostPreview)}
                </View>
              </Card.Content>
            </Card>
          )}

          <Card
            mode="contained"
            style={[
              styles.heroCard,
              {
                backgroundColor: premiumSurface,
                borderColor: premiumBorder,
              },
            ]}
          >
            <Card.Content>
              <View style={styles.heroTop}>
                <View style={styles.heroInfo}>
                  <Chip
                    compact
                    icon={weeklyView.completed ? "check-circle" : "fire"}
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: softPrimary,
                    }}
                    textStyle={{
                      color: theme.colors.primary,
                      fontWeight: "900",
                    }}
                  >
                    Semana actual
                  </Chip>

                  <Text
                    variant="headlineSmall"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      marginTop: 14,
                    }}
                  >
                    {weeklyView.trainedDaysCount}/{weeklyView.goal} días
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 5,
                      lineHeight: 21,
                    }}
                  >
                    {weeklyView.message}
                  </Text>
                </View>

                <View style={styles.heroDonutBox}>
                  <ProgressDonut
                    progress={weeklyView.progressPercent}
                    size={118}
                    strokeWidth={12}
                    label=""
                    subLabel=""
                  />

                  <View style={styles.heroDonutCenter}>
                    <Text
                      variant="headlineSmall"
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "900",
                        textAlign: "center",
                        includeFontPadding: false,
                        lineHeight: 29,
                      }}
                    >
                      {weeklyView.progressPercent}%
                    </Text>

                    <Text
                      variant="labelSmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontWeight: "800",
                        includeFontPadding: false,
                      }}
                    >
                      Semana
                    </Text>
                  </View>
                </View>
              </View>

              <ProgressBar
                progress={weeklyView.progressPercent / 100}
                color={theme.colors.primary}
                style={[
                  styles.heroProgress,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(15,23,42,0.08)",
                  },
                ]}
              />

              <View style={styles.heroStats}>
                <View
                  style={[
                    styles.heroStatItem,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {formatNumber(weeklyView.weeklyVolume)}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Kg semana
                  </Text>
                </View>

                <View
                  style={[
                    styles.heroStatItem,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {weeklyView.weeklyCompletedExercises || 0}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Ejercicios
                  </Text>
                </View>

                <View
                  style={[
                    styles.heroStatItem,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {formatDuration(weeklyView.weeklyDurationSeconds)}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Tiempo
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
              <View style={styles.nextHeader}>
                <View style={styles.nextTextBox}>
                  <Text
                    variant="titleLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      letterSpacing: -0.3,
                    }}
                  >
                    Próximo entrenamiento
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 4,
                    }}
                  >
                    {nextTrainingDay
                      ? "Entrá directo al día sugerido."
                      : "Todavía no creaste días de entrenamiento."}
                  </Text>
                </View>

                <View style={[styles.nextIcon, { backgroundColor: softPrimary }]}>
                  <Text
                    variant="headlineSmall"
                    style={{
                      color: theme.colors.primary,
                      fontWeight: "900",
                    }}
                  >
                    {nextTrainingDay ? "🏋️" : "+"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.nextBox,
                  {
                    backgroundColor: mutedSurface,
                    borderColor: premiumBorder,
                  },
                ]}
              >
                <View style={styles.nextBoxText}>
                  <Text
                    variant="titleMedium"
                    numberOfLines={1}
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                    }}
                  >
                    {nextTrainingDay?.name || "Crear rutina"}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 3,
                    }}
                  >
                    {nextTrainingDay
                      ? `${trainingDays.length} días creados en Entreno`
                      : "Agregá tus días para empezar a registrar."}
                  </Text>
                </View>

                <Button
                  mode="contained"
                  icon={nextTrainingDay ? "play" : "plus"}
                  style={styles.nextButton}
                  onPress={goToWorkoutDay}
                >
                  {nextTrainingDay ? "Entrar" : "Crear"}
                </Button>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.grid}>
            <Card
              mode="contained"
              style={[
                styles.smallStatCard,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content>
                <Text
                  variant="headlineSmall"
                  style={{ color: theme.colors.primary, fontWeight: "900" }}
                >
                  {stats.totalWorkouts}
                </Text>

                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Entrenos guardados
                </Text>
              </Card.Content>
            </Card>

            <Card
              mode="contained"
              style={[
                styles.smallStatCard,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content>
                <Text
                  variant="headlineSmall"
                  style={{ color: theme.colors.primary, fontWeight: "900" }}
                >
                  {formatNumber(stats.totalVolume)}
                </Text>

                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Kg totales
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
            <Card.Content>
              <Text
                variant="titleLarge"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                  marginBottom: 12,
                  letterSpacing: -0.3,
                }}
              >
                Última actividad
              </Text>

              {lastSession ? (
                <View
                  style={[
                    styles.lastSessionBox,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <View style={styles.lastSessionLeft}>
                    <Text
                      variant="titleMedium"
                      numberOfLines={1}
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      {lastSession.dayName || "Entrenamiento"}
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 3,
                      }}
                    >
                      {formatSessionDate(lastSession.createdDate)}
                    </Text>
                  </View>

                  <View style={styles.lastSessionRight}>
                    <Text
                      variant="labelLarge"
                      style={{ color: theme.colors.primary, fontWeight: "900" }}
                    >
                      {formatDuration(lastSession.durationSeconds)}
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {formatNumber(lastSession.totalVolume)} kg
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyActivityBox,
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
                    Todavía no hay actividad
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      textAlign: "center",
                      lineHeight: 21,
                      marginTop: 6,
                    }}
                  >
                    Finalizá tu primer entrenamiento para ver el resumen acá.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {!!bestExercise && (
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
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 12,
                    letterSpacing: -0.3,
                  }}
                >
                  Ejercicio destacado
                </Text>

                <View
                  style={[
                    styles.featuredExerciseBox,
                    {
                      backgroundColor: softPrimary,
                      borderColor: theme.colors.primary,
                    },
                  ]}
                >
                  <View style={styles.featuredExerciseText}>
                    <Text
                      variant="titleMedium"
                      numberOfLines={1}
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      {bestExercise.name}
                    </Text>

                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 3,
                      }}
                    >
                      Mejor marca: {bestExercise.bestWeight || 0}kg ·{" "}
                      {bestExercise.completedCount || 0} registros
                    </Text>
                  </View>

                  <Chip
                    compact
                    icon="trending-up"
                    style={{ backgroundColor: theme.colors.surface }}
                    textStyle={{
                      color: theme.colors.primary,
                      fontWeight: "900",
                    }}
                  >
                    {Number(bestExercise.progressWeight) > 0
                      ? `+${bestExercise.progressWeight}kg`
                      : "Constante"}
                  </Chip>
                </View>
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
            <Card.Content>
              <Text
                variant="titleLarge"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                  marginBottom: 14,
                  letterSpacing: -0.3,
                }}
              >
                Accesos rápidos
              </Text>

              <View style={styles.quickGrid}>
                {renderQuickAction({
                  title: "Entrenar",
                  subtitle: "Rutinas y ejercicios",
                  icon: "dumbbell",
                  featured: true,
                  onPress: () => goToTab("Entreno"),
                })}

                {renderQuickAction({
                  title: "Registro",
                  subtitle: "Ver progreso",
                  icon: "chart-line",
                  onPress: () => goToTab("Registro"),
                })}

                {renderQuickAction({
                  title: "Social",
                  subtitle: "Publicaciones",
                  icon: "account-group-outline",
                  onPress: () => goToTab("Social"),
                })}

                {renderQuickAction({
                  title: "Perfil",
                  subtitle: "Cuenta y tema",
                  icon: "account-outline",
                  onPress: () => goToTab("Perfil"),
                })}
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 58,
    paddingBottom: 120,
  },

  headerCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTextBox: {
    flex: 1,
    marginRight: 16,
  },

  greetingPill: {
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

  greetingIcon: {
    width: 26,
    height: 26,
    margin: 0,
  },

  title: {
    fontWeight: "900",
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    marginTop: 6,
    lineHeight: 20,
  },

  avatarTouchable: {
    borderRadius: 999,
  },

  avatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarStatus: {
    position: "absolute",
    right: 5,
    bottom: 6,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 2,
  },

  headerBottomRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },

  headerMiniStat: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },

  loadingBox: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
  },

  socialCard: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
  },

  socialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  socialHeaderText: {
    flex: 1,
    marginRight: 10,
  },

  socialPreviewList: {
    gap: 10,
  },

  socialPreviewItem: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  socialPreviewContent: {
    padding: 14,
  },

  socialPreviewTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  socialPreviewUserBox: {
    flex: 1,
    marginLeft: 11,
    marginRight: 10,
  },

  socialPreviewImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#00000010",
  },

  socialPreviewMiniIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  socialPreviewIcon: {
    margin: 0,
  },

  socialPreviewBottom: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  heroCard: {
    borderRadius: 32,
    marginBottom: 16,
    borderWidth: 1,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroInfo: {
    flex: 1,
    marginRight: 14,
  },

  heroDonutBox: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  heroDonutCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },

  heroProgress: {
    height: 10,
    borderRadius: 999,
    marginTop: 18,
  },

  heroStats: {
    flexDirection: "row",
    marginTop: 18,
    gap: 10,
  },

  heroStatItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },

  card: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
  },

  nextHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  nextTextBox: {
    flex: 1,
    marginRight: 14,
  },

  nextIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  nextBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  nextBoxText: {
    flex: 1,
    marginRight: 12,
  },

  nextButton: {
    borderRadius: 16,
  },

  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },

  smallStatCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
  },

  lastSessionBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  lastSessionLeft: {
    flex: 1,
    marginRight: 12,
  },

  lastSessionRight: {
    alignItems: "flex-end",
  },

  emptyActivityBox: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },

  featuredExerciseBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  featuredExerciseText: {
    flex: 1,
    marginRight: 12,
  },

  quickGrid: {
    gap: 10,
  },

  quickAction: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },

  quickActionContent: {
    minHeight: 76,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  quickIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  quickIcon: {
    margin: 0,
  },

  quickTextBox: {
    flex: 1,
  },

  quickArrow: {
    margin: 0,
  },
});