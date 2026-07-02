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

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
};

const getInitial = (name) => {
  return String(name || "F").charAt(0).toUpperCase();
};

export default function HomeScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [trainingDays, setTrainingDays] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = userProfile?.name || user?.displayName || "Usuario Forte";
  const photoURL = userProfile?.photoURL || user?.photoURL || null;

  const weeklyGoalDays = Math.max(1, trainingDays.length || 1);

  const stats = useMemo(() => {
    return buildRecordStats({
      sessions,
      weeklyGoalDays,
    });
  }, [sessions, weeklyGoalDays]);

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

  const loadData = useCallback(async () => {
    try {
      if (!user?.uid) return;

      const [sessionsResponse, trainingDaysResponse] = await Promise.all([
        getWorkoutSessions({
          uid: user.uid,
          maxResults: 80,
        }),
        getTrainingDays(user.uid),
      ]);

      setSessions(Array.isArray(sessionsResponse) ? sessionsResponse : []);
      setTrainingDays(
        Array.isArray(trainingDaysResponse) ? trainingDaysResponse : []
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
            backgroundColor: featured
              ? theme.custom.softPrimary
              : theme.colors.surface,
            borderColor: featured
              ? theme.colors.primary
              : theme.colors.outlineVariant,
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
                  : theme.colors.surfaceVariant,
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
        </View>
      </TouchableRipple>
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerTextBox}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {getGreeting()},
          </Text>

          <Text
            variant="headlineMedium"
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.onBackground }]}
          >
            {displayName}
          </Text>
        </View>

        {photoURL ? (
          <Avatar.Image size={58} source={{ uri: photoURL }} />
        ) : (
          <Avatar.Text
            size={58}
            label={getInitial(displayName)}
            style={{ backgroundColor: theme.custom.softPrimary }}
            color={theme.colors.primary}
          />
        )}
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
          <Card
            mode="contained"
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Card.Content>
              <View style={styles.heroTop}>
                <View style={styles.heroInfo}>
                  <Chip
                    compact
                    icon="fire"
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: theme.custom.softPrimary,
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
                    {stats.weeklyTrainedDays}/{stats.weeklyGoalDays} días
                  </Text>

                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 5,
                      lineHeight: 21,
                    }}
                  >
                    {stats.weeklyMessage}
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
                  styles.heroProgress,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />

              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {formatNumber(stats.weeklyVolume)}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Kg semana
                  </Text>
                </View>

                <View style={styles.heroStatItem}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {stats.weeklyCompletedExercises || 0}
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Ejercicios
                  </Text>
                </View>

                <View style={styles.heroStatItem}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.primary, fontWeight: "900" }}
                  >
                    {formatDuration(stats.weeklyDurationSeconds)}
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
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.nextHeader}>
                <View style={styles.nextTextBox}>
                  <Text
                    variant="titleLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
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

                <View
                  style={[
                    styles.nextIcon,
                    { backgroundColor: theme.custom.softPrimary },
                  ]}
                >
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
                  { backgroundColor: theme.colors.surfaceVariant },
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
                { backgroundColor: theme.colors.surface },
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
                { backgroundColor: theme.colors.surface },
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
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text
                variant="titleLarge"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                  marginBottom: 12,
                }}
              >
                Última actividad
              </Text>

              {lastSession ? (
                <View
                  style={[
                    styles.lastSessionBox,
                    { backgroundColor: theme.colors.surfaceVariant },
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
                <View style={styles.emptyActivityBox}>
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
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "900",
                    marginBottom: 12,
                  }}
                >
                  Ejercicio destacado
                </Text>

                <View
                  style={[
                    styles.featuredExerciseBox,
                    { backgroundColor: theme.custom.softPrimary },
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
    paddingTop: 62,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTextBox: {
    flex: 1,
    marginRight: 14,
  },
  title: {
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  loadingBox: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 32,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroInfo: {
    flex: 1,
    marginRight: 14,
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
  },
  card: {
    borderRadius: 28,
    marginBottom: 16,
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
  },
  lastSessionBox: {
    borderRadius: 22,
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
  },
  featuredExerciseBox: {
    borderRadius: 22,
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
});