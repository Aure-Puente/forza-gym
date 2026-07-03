import React, { useCallback, useMemo, useState } from "react";
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
  ProgressBar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";

import {
  createGoal,
  deleteGoal,
  getGoals,
  markGoalCompleted,
  updateGoal,
  updateGoalProgress,
} from "../services/goalsService";

import { createGoalPost } from "../services/postsService";

const GOAL_TYPES = [
  {
    value: "weight",
    label: "Peso",
    description: "Meta en kg",
    icon: "dumbbell",
    unit: "kg",
  },
  {
    value: "workouts",
    label: "Entrenos",
    description: "Cantidad total",
    icon: "calendar-check",
    unit: "entrenos",
  },
  {
    value: "volume",
    label: "Volumen",
    description: "Carga acumulada",
    icon: "chart-bar",
    unit: "kg",
  },
  {
    value: "custom",
    label: "Libre",
    description: "Personalizado",
    icon: "target",
    unit: "",
  },
];

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
};

const getGoalProgress = (goal) => {
  const current = Number(goal.currentValue) || 0;
  const target = Number(goal.targetValue) || 0;

  if (target <= 0) return 0;

  return Math.min(100, Math.round((current / target) * 100));
};

const getGoalTypeData = (type) => {
  return GOAL_TYPES.find((item) => item.value === type) || GOAL_TYPES[3];
};

export default function GoalsScreen({ navigation }) {
  const theme = useTheme();
  const { user, userProfile } = useAuth();

  const [goals, setGoals] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [goalDialogVisible, setGoalDialogVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("weight");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("kg");

  const [saving, setSaving] = useState(false);

  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [shareGoal, setShareGoal] = useState(null);
  const [shareComment, setShareComment] = useState("");
  const [sharing, setSharing] = useState(false);

  const [error, setError] = useState("");

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

  const activeGoals = useMemo(() => {
    return goals.filter((goal) => !goal.completed);
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals.filter((goal) => goal.completed);
  }, [goals]);

  const generalProgress = useMemo(() => {
    if (goals.length === 0) return 0;

    return Math.round((completedGoals.length / goals.length) * 100);
  }, [completedGoals.length, goals.length]);

  const loadGoals = useCallback(async () => {
    try {
      setError("");

      if (!user?.uid) return;

      const response = await getGoals({
        uid: user.uid,
      });

      setGoals(response);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar los objetivos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
  };

  const resetForm = () => {
    setSelectedGoal(null);
    setTitle("");
    setType("weight");
    setTargetValue("");
    setCurrentValue("");
    setUnit("kg");
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setGoalDialogVisible(true);
  };

  const openEditDialog = (goal) => {
    setSelectedGoal(goal);
    setTitle(goal.title || "");
    setType(goal.type || "custom");
    setTargetValue(String(goal.targetValue || ""));
    setCurrentValue(String(goal.currentValue || ""));
    setUnit(goal.unit || "");
    setError("");
    setGoalDialogVisible(true);
  };

  const closeGoalDialog = () => {
    if (saving) return;

    setGoalDialogVisible(false);
    resetForm();
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);

    const typeData = getGoalTypeData(nextType);

    setUnit(typeData.unit);
  };

  const handleSaveGoal = async () => {
    try {
      if (!title.trim()) {
        Alert.alert("Objetivo incompleto", "Ingresá un título.");
        return;
      }

      if ((Number(targetValue) || 0) <= 0) {
        Alert.alert("Objetivo incompleto", "Ingresá una meta mayor a 0.");
        return;
      }

      setSaving(true);

      if (selectedGoal) {
        await updateGoal({
          uid: user.uid,
          goalId: selectedGoal.id,
          title,
          type,
          targetValue,
          currentValue,
          unit,
        });
      } else {
        await createGoal({
          uid: user.uid,
          title,
          type,
          targetValue,
          currentValue,
          unit,
        });
      }

      closeGoalDialog();
      await loadGoals();
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo guardar el objetivo.");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (goal) => {
    setGoalToDelete(goal);
    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;

    setDeleteDialogVisible(false);
    setGoalToDelete(null);
  };

  const handleDeleteGoal = async () => {
    try {
      if (!goalToDelete) return;

      setDeleting(true);

      await deleteGoal({
        uid: user.uid,
        goalId: goalToDelete.id,
      });

      closeDeleteDialog();
      await loadGoals();
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo eliminar el objetivo.");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuickProgress = async ({ goal, amount }) => {
    try {
      const current = Number(goal.currentValue) || 0;
      const nextValue = Math.max(0, current + amount);

      setGoals((prev) =>
        prev.map((item) =>
          item.id === goal.id
            ? {
                ...item,
                currentValue: nextValue,
                completed:
                  Number(item.targetValue) > 0 &&
                  nextValue >= Number(item.targetValue),
              }
            : item
        )
      );

      await updateGoalProgress({
        uid: user.uid,
        goalId: goal.id,
        currentValue: nextValue,
        targetValue: goal.targetValue,
      });

      await loadGoals();
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo actualizar el progreso.");
      await loadGoals();
    }
  };

  const handleCompleteGoal = async (goal) => {
    try {
      await markGoalCompleted({
        uid: user.uid,
        goalId: goal.id,
        targetValue: goal.targetValue,
      });

      await loadGoals();

      Alert.alert(
        "Objetivo cumplido",
        "¡Excelente! Ahora podés compartirlo en Social."
      );
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo completar el objetivo.");
    }
  };

  const openShareDialog = (goal) => {
    if (!goal.completed) {
      Alert.alert(
        "Objetivo pendiente",
        "Primero marcá el objetivo como cumplido para compartirlo."
      );
      return;
    }

    setShareGoal(goal);
    setShareComment("");
    setShareDialogVisible(true);
  };

  const closeShareDialog = () => {
    if (sharing) return;

    setShareDialogVisible(false);
    setShareGoal(null);
    setShareComment("");
  };

  const getDefaultShareText = () => {
    if (!shareGoal) return "";

    const current = Number(shareGoal.currentValue) || 0;
    const target = Number(shareGoal.targetValue) || 0;
    const goalUnit = shareGoal.unit || "";

    return `Cumplí mi objetivo en Forte: ${shareGoal.title}. Llegué a ${formatNumber(
      current
    )}${goalUnit ? ` ${goalUnit}` : ""} de ${formatNumber(target)}${
      goalUnit ? ` ${goalUnit}` : ""
    } 💪`;
  };

  const handleShareGoal = async () => {
    try {
      if (!shareGoal) return;

      setSharing(true);

      const userName =
        userProfile?.name || user?.displayName || "Usuario Forte";

      const userPhotoURL = userProfile?.photoURL || user?.photoURL || null;

      await createGoalPost({
        uid: user.uid,
        userName,
        userPhotoURL,
        goal: shareGoal,
        text: shareComment.trim() ? shareComment.trim() : getDefaultShareText(),
      });

      closeShareDialog();

      Alert.alert(
        "Objetivo compartido",
        "Tu objetivo cumplido se publicó en Social."
      );
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo compartir el objetivo.");
    } finally {
      setSharing(false);
    }
  };

  const renderTypeOption = (item) => {
    const selected = type === item.value;

    return (
      <TouchableRipple
        key={item.value}
        borderless
        onPress={() => handleTypeChange(item.value)}
        style={[
          styles.typeOption,
          {
            backgroundColor: selected ? softPrimary : mutedSurface,
            borderColor: selected ? theme.colors.primary : premiumBorder,
          },
        ]}
      >
        <View style={styles.typeOptionContent}>
          <View
            style={[
              styles.typeIconBox,
              {
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: selected ? theme.colors.primary : premiumBorder,
              },
            ]}
          >
            <IconButton
              icon={item.icon}
              size={18}
              iconColor={
                selected
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              }
              style={styles.typeIcon}
            />
          </View>

          <View style={styles.typeTextBox}>
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
              {item.label}
            </Text>

            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 1,
              }}
            >
              {item.description}
            </Text>
          </View>

          {selected && (
            <View
              style={[
                styles.typeSelectedBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <IconButton
                icon="check"
                size={12}
                iconColor={theme.colors.onPrimary}
                style={styles.typeSelectedIcon}
              />
            </View>
          )}
        </View>
      </TouchableRipple>
    );
  };

  const renderGoalCard = (goal) => {
    const progress = getGoalProgress(goal);
    const typeData = getGoalTypeData(goal.type);
    const completed = !!goal.completed;

    return (
      <Card
        key={goal.id}
        mode="contained"
        style={[
          styles.goalCard,
          {
            backgroundColor: completed ? successSoft : premiumSurface,
            borderColor: completed
              ? theme.dark
                ? "rgba(134,239,172,0.22)"
                : "rgba(22,163,74,0.16)"
              : premiumBorder,
          },
        ]}
      >
        <Card.Content style={styles.goalCardContent}>
          <View style={styles.goalHeader}>
            <View
              style={[
                styles.goalIconBox,
                {
                  backgroundColor: completed ? successColor : softPrimary,
                },
              ]}
            >
              <IconButton
                icon={completed ? "check-bold" : typeData.icon}
                size={22}
                iconColor={
                  completed ? theme.colors.background : theme.colors.primary
                }
                style={styles.goalIcon}
              />
            </View>

            <View style={styles.goalTitleBox}>
              <Text
                variant="titleMedium"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                  letterSpacing: -0.2,
                  lineHeight: 23,
                }}
              >
                {goal.title}
              </Text>

              <View style={styles.goalMetaRow}>
                <Text
                  variant="bodySmall"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontWeight: "700",
                  }}
                >
                  {typeData.label}
                </Text>

                <View
                  style={[
                    styles.metaDot,
                    { backgroundColor: theme.colors.onSurfaceVariant },
                  ]}
                />

                <Text
                  variant="bodySmall"
                  style={{
                    color: completed ? successColor : theme.colors.primary,
                    fontWeight: "900",
                  }}
                >
                  {completed ? "Cumplido" : "En progreso"}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.percentBadge,
                {
                  backgroundColor: completed ? successColor : softPrimary,
                },
              ]}
            >
              <Text
                variant="labelLarge"
                style={{
                  color: completed
                    ? theme.colors.background
                    : theme.colors.primary,
                  fontWeight: "900",
                }}
              >
                {progress}%
              </Text>
            </View>
          </View>

          <View style={styles.goalProgressInfo}>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                lineHeight: 21,
              }}
            >
              {formatNumber(goal.currentValue)}
              {goal.unit ? ` ${goal.unit}` : ""} de{" "}
              {formatNumber(goal.targetValue)}
              {goal.unit ? ` ${goal.unit}` : ""}
            </Text>
          </View>

          <ProgressBar
            progress={progress / 100}
            color={completed ? successColor : theme.colors.primary}
            style={[
              styles.progressBar,
              {
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(15,23,42,0.08)",
              },
            ]}
          />

          {!completed ? (
            <View style={styles.goalActions}>
              <View style={styles.quickActions}>
                <Button
                  mode="outlined"
                  compact
                  icon="minus"
                  style={[
                    styles.quickButton,
                    {
                      borderColor: premiumBorder,
                    },
                  ]}
                  onPress={() =>
                    handleQuickProgress({
                      goal,
                      amount: -1,
                    })
                  }
                >
                  1
                </Button>

                <Button
                  mode="outlined"
                  compact
                  icon="plus"
                  style={[
                    styles.quickButton,
                    {
                      borderColor: premiumBorder,
                    },
                  ]}
                  onPress={() =>
                    handleQuickProgress({
                      goal,
                      amount: 1,
                    })
                  }
                >
                  1
                </Button>
              </View>

              <Button
                mode="contained"
                compact
                icon="check-circle-outline"
                style={styles.completeButton}
                contentStyle={styles.goalButtonContent}
                onPress={() => handleCompleteGoal(goal)}
              >
                Cumplir
              </Button>
            </View>
          ) : (
            <TouchableRipple
              borderless
              onPress={() => openShareDialog(goal)}
              style={[
                styles.shareButton,
                {
                  backgroundColor: theme.dark
                    ? "rgba(134,239,172,0.16)"
                    : "rgba(22,163,74,0.1)",
                  borderColor: theme.dark
                    ? "rgba(134,239,172,0.26)"
                    : "rgba(22,163,74,0.18)",
                },
              ]}
            >
              <View style={styles.shareButtonContent}>
                <View
                  style={[
                    styles.shareIconBox,
                    {
                      backgroundColor: successColor,
                    },
                  ]}
                >
                  <IconButton
                    icon="share-variant-outline"
                    size={19}
                    iconColor={theme.colors.background}
                    style={styles.shareIcon}
                  />
                </View>

                <View style={styles.shareTextBox}>
                  <Text
                    variant="labelLarge"
                    style={{
                      color: successColor,
                      fontWeight: "900",
                    }}
                  >
                    Compartir logro
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 1,
                    }}
                  >
                    Publicalo en Social
                  </Text>
                </View>

                <IconButton
                  icon="chevron-right"
                  size={22}
                  iconColor={successColor}
                  style={styles.shareArrow}
                />
              </View>
            </TouchableRipple>
          )}

          <View style={styles.secondaryActions}>
            <IconButton
              icon="pencil-outline"
              size={21}
              iconColor={theme.colors.primary}
              onPress={() => openEditDialog(goal)}
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: softPrimary,
                },
              ]}
            />

            <IconButton
              icon="trash-can-outline"
              size={21}
              iconColor={theme.colors.error}
              onPress={() => openDeleteDialog(goal)}
              style={[
                styles.iconActionButton,
                {
                  backgroundColor: dangerSoft,
                },
              ]}
            />
          </View>
        </Card.Content>
      </Card>
    );
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
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor={theme.colors.onBackground}
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: mutedSurface,
              },
            ]}
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
                icon="target"
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
                FORTE GOALS
              </Text>
            </View>

            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onBackground }]}
            >
              Objetivos
            </Text>

            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                lineHeight: 20,
                marginTop: 5,
              }}
            >
              Marcá metas, seguí avances y compartí tus logros.
            </Text>
          </View>
        </View>

        {!loading && goals.length > 0 && (
          <Button
            mode="contained"
            icon="plus"
            style={styles.createButton}
            contentStyle={styles.buttonContent}
            onPress={openCreateDialog}
          >
            Nuevo objetivo
          </Button>
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
              Cargando objetivos...
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
                styles.summaryCard,
                {
                  backgroundColor: premiumSurface,
                  borderColor: premiumBorder,
                },
              ]}
            >
              <Card.Content style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextBox}>
                    <View
                      style={[
                        styles.summaryIconBox,
                        {
                          backgroundColor: softPrimary,
                        },
                      ]}
                    >
                      <IconButton
                        icon="chart-line"
                        size={20}
                        iconColor={theme.colors.primary}
                        style={styles.summaryIcon}
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
                      Progreso general
                    </Text>

                    <Text
                      variant="bodyMedium"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 5,
                        lineHeight: 21,
                      }}
                    >
                      {completedGoals.length} de {goals.length} objetivos
                      cumplidos.
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.summaryPercentBox,
                      {
                        backgroundColor: softPrimary,
                      },
                    ]}
                  >
                    <Text
                      variant="headlineMedium"
                      style={{
                        color: theme.colors.primary,
                        fontWeight: "900",
                      }}
                    >
                      {generalProgress}%
                    </Text>
                  </View>
                </View>

                <ProgressBar
                  progress={generalProgress / 100}
                  color={theme.colors.primary}
                  style={[
                    styles.summaryProgress,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(15,23,42,0.08)",
                    },
                  ]}
                />
              </Card.Content>
            </Card>

            {goals.length === 0 ? (
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
                      { backgroundColor: softPrimary },
                    ]}
                  >
                    <IconButton
                      icon="target"
                      size={31}
                      iconColor={theme.colors.primary}
                      style={styles.emptyIconButton}
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
                    Creá tu primer objetivo
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
                    Podés crear metas de peso, entrenamientos, volumen total o
                    cualquier objetivo personalizado.
                  </Text>

                  <Button
                    mode="contained"
                    icon="plus"
                    style={styles.emptyButton}
                    contentStyle={styles.buttonContent}
                    onPress={openCreateDialog}
                  >
                    Nuevo objetivo
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                {activeGoals.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text
                          variant="titleLarge"
                          style={[
                            styles.sectionTitle,
                            { color: theme.colors.onBackground },
                          ]}
                        >
                          En progreso
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {activeGoals.length} activos
                        </Text>
                      </View>
                    </View>

                    {activeGoals.map(renderGoalCard)}
                  </>
                )}

                {completedGoals.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <View>
                        <Text
                          variant="titleLarge"
                          style={[
                            styles.sectionTitle,
                            { color: theme.colors.onBackground },
                          ]}
                        >
                          Cumplidos
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          Listos para compartir
                        </Text>
                      </View>
                    </View>

                    {completedGoals.map(renderGoalCard)}
                  </>
                )}
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
            visible={goalDialogVisible}
            onDismiss={closeGoalDialog}
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
                  icon={selectedGoal ? "pencil-outline" : "target"}
                  size={24}
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
                {selectedGoal ? "Editar objetivo" : "Nuevo objetivo"}
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
                Configurá una meta clara para seguir tu progreso.
              </Text>
            </View>

            <Dialog.ScrollArea style={styles.goalDialogScrollArea}>
              <ScrollView
                contentContainerStyle={styles.dialogContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
              >
                <TextInput
                  mode="outlined"
                  label="Título"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ej: Llegar a 80kg en press banca"
                  style={styles.input}
                  outlineStyle={{ borderRadius: 16 }}
                />

                <View style={styles.formSection}>
                  <Text
                    variant="labelLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      marginBottom: 10,
                    }}
                  >
                    Tipo de objetivo
                  </Text>

                  <View style={styles.typeGrid}>
                    {GOAL_TYPES.map(renderTypeOption)}
                  </View>
                </View>

                <View style={styles.formGrid}>
                  <TextInput
                    mode="outlined"
                    label="Actual"
                    value={currentValue}
                    onChangeText={setCurrentValue}
                    keyboardType="decimal-pad"
                    style={styles.formInput}
                    outlineStyle={{ borderRadius: 16 }}
                  />

                  <TextInput
                    mode="outlined"
                    label="Meta"
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType="decimal-pad"
                    style={styles.formInput}
                    outlineStyle={{ borderRadius: 16 }}
                  />
                </View>

                <TextInput
                  mode="outlined"
                  label="Unidad"
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="kg, entrenos, días..."
                  style={styles.input}
                  outlineStyle={{ borderRadius: 16 }}
                />
              </ScrollView>
            </Dialog.ScrollArea>

            <View style={styles.dialogActionsCustom}>
              <Button
                mode="outlined"
                disabled={saving}
                onPress={closeGoalDialog}
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
                onPress={handleSaveGoal}
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
                Eliminar objetivo
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
                Esta acción eliminará el objetivo de tu lista. No vas a poder
                recuperarlo desde la app.
              </Text>

              {!!goalToDelete?.title && (
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
                    OBJETIVO
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
                    {goalToDelete.title}
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
                  onPress={handleDeleteGoal}
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
                    backgroundColor: successSoft,
                  },
                ]}
              >
                <IconButton
                  icon="share-variant-outline"
                  size={24}
                  iconColor={successColor}
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
                Compartir logro
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
                Sumá un comentario y publicalo en Social.
              </Text>
            </View>

            <Dialog.ScrollArea style={styles.shareDialogScrollArea}>
              <ScrollView
                contentContainerStyle={styles.dialogContent}
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
                  numberOfLines={4}
                  placeholder="Ej: Después de varias semanas, objetivo cumplido 💪"
                  outlineStyle={{ borderRadius: 16 }}
                />

                <View
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: mutedSurface,
                      borderColor: premiumBorder,
                    },
                  ]}
                >
                  <View style={styles.previewHeader}>
                    <View
                      style={[
                        styles.previewIconBox,
                        {
                          backgroundColor: successSoft,
                        },
                      ]}
                    >
                      <IconButton
                        icon="share-variant-outline"
                        size={18}
                        iconColor={successColor}
                        style={styles.previewIcon}
                      />
                    </View>

                    <Text
                      variant="labelLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
                      }}
                    >
                      Vista previa
                    </Text>
                  </View>

                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      lineHeight: 21,
                      marginTop: 10,
                    }}
                  >
                    {shareComment.trim() || getDefaultShareText()}
                  </Text>
                </View>
              </ScrollView>
            </Dialog.ScrollArea>

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
                onPress={handleShareGoal}
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
    paddingTop: 50,
    paddingBottom: 110,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 0,
    marginRight: 12,
    marginTop: 2,
  },

  headerText: {
    flex: 1,
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

  createButton: {
    borderRadius: 18,
    marginBottom: 16,
  },

  buttonContent: {
    height: 50,
  },

  loadingBox: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
  },

  errorCard: {
    borderRadius: 20,
    marginBottom: 14,
  },

  summaryCard: {
    borderRadius: 30,
    marginBottom: 18,
    borderWidth: 1,
    overflow: "hidden",
  },

  summaryContent: {
    paddingVertical: 20,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryTextBox: {
    flex: 1,
    marginRight: 12,
  },

  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  summaryIcon: {
    margin: 0,
  },

  summaryPercentBox: {
    minWidth: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryProgress: {
    height: 10,
    borderRadius: 999,
    marginTop: 18,
  },

  emptyCard: {
    borderRadius: 30,
    borderWidth: 1,
  },

  emptyContent: {
    alignItems: "center",
  },

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  emptyIconButton: {
    margin: 0,
  },

  emptyButton: {
    borderRadius: 18,
    marginTop: 22,
    alignSelf: "stretch",
  },

  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  goalCard: {
    borderRadius: 28,
    marginBottom: 14,
    borderWidth: 1,
  },

  goalCardContent: {
    paddingVertical: 16,
  },

  goalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  goalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },

  goalIcon: {
    margin: 0,
  },

  goalTitleBox: {
    flex: 1,
    marginRight: 10,
  },

  goalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    flexWrap: "wrap",
  },

  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.65,
    marginHorizontal: 7,
  },

  percentBadge: {
    minWidth: 54,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  goalProgressInfo: {
    marginTop: 16,
  },

  progressBar: {
    height: 9,
    borderRadius: 999,
    marginTop: 10,
  },

  goalActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },

  quickActions: {
    flexDirection: "row",
    gap: 8,
  },

  quickButton: {
    borderRadius: 14,
    borderWidth: 1,
  },

  completeButton: {
    flex: 1,
    borderRadius: 15,
  },

  goalButtonContent: {
    height: 42,
  },

  shareButton: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 16,
  },

  shareButtonContent: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  shareIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  shareIcon: {
    margin: 0,
  },

  shareTextBox: {
    flex: 1,
  },

  shareArrow: {
    margin: 0,
  },

  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
  },

  iconActionButton: {
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
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: "center",
  },

  dialogHeaderIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  dialogHeaderIconButton: {
    margin: 0,
  },

  goalDialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: 430,
  },

  shareDialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: 330,
  },

  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 26,
  },

  input: {
    marginBottom: 14,
  },

  formSection: {
    marginBottom: 14,
  },

  typeGrid: {
    gap: 10,
  },

  typeOption: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  typeOptionContent: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  typeIcon: {
    margin: 0,
  },

  typeTextBox: {
    flex: 1,
  },

  typeSelectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  typeSelectedIcon: {
    margin: 0,
  },

  formGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  formInput: {
    flex: 1,
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

  previewBox: {
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  previewIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  previewIcon: {
    margin: 0,
  },
});