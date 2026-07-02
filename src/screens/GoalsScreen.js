import React, { useCallback, useMemo, useState } from "react";
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
  FAB,
  IconButton,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
  TextInput,
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
    icon: "dumbbell",
    unit: "kg",
  },
  {
    value: "workouts",
    label: "Entrenos",
    icon: "calendar-check",
    unit: "entrenos",
  },
  {
    value: "volume",
    label: "Volumen",
    icon: "chart-bar",
    unit: "kg",
  },
  {
    value: "custom",
    label: "Libre",
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

  const handleDeleteGoal = (goal) => {
    Alert.alert(
      "Eliminar objetivo",
      `¿Querés eliminar "${goal.title}"?`,
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

              await deleteGoal({
                uid: user.uid,
                goalId: goal.id,
              });

              await loadGoals();
            } catch (err) {
              Alert.alert(
                "Error",
                err?.message || "No se pudo eliminar el objetivo."
              );
              setLoading(false);
            }
          },
        },
      ]
    );
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

      const userPhotoURL =
        userProfile?.photoURL || user?.photoURL || null;

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
            backgroundColor: completed
              ? theme.custom.softPrimary
              : theme.colors.surface,
          },
        ]}
      >
        <Card.Content>
          <View style={styles.goalHeader}>
            <View
              style={[
                styles.goalIconBox,
                {
                  backgroundColor: completed
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ]}
            >
              <IconButton
                icon={completed ? "check-bold" : typeData.icon}
                size={22}
                iconColor={
                  completed ? theme.colors.onPrimary : theme.colors.primary
                }
                style={styles.goalIcon}
              />
            </View>

            <View style={styles.goalTitleBox}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                }}
              >
                {goal.title}
              </Text>

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 3,
                }}
              >
                {typeData.label} · {completed ? "Cumplido" : "En progreso"}
              </Text>
            </View>

            <Chip
              compact
              style={{
                backgroundColor: completed
                  ? theme.colors.surface
                  : theme.colors.surfaceVariant,
              }}
              textStyle={{
                color: completed
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
                fontWeight: "900",
              }}
            >
              {progress}%
            </Chip>
          </View>

          <View style={styles.goalProgressInfo}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {formatNumber(goal.currentValue)}
              {goal.unit ? ` ${goal.unit}` : ""} de{" "}
              {formatNumber(goal.targetValue)}
              {goal.unit ? ` ${goal.unit}` : ""}
            </Text>
          </View>

          <ProgressBar
            progress={progress / 100}
            color={theme.colors.primary}
            style={[
              styles.progressBar,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />

          <View style={styles.goalActions}>
            {!completed && (
              <>
                <Button
                  mode="outlined"
                  compact
                  icon="minus"
                  style={styles.smallButton}
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
                  style={styles.smallButton}
                  onPress={() =>
                    handleQuickProgress({
                      goal,
                      amount: 1,
                    })
                  }
                >
                  1
                </Button>

                <Button
                  mode="contained-tonal"
                  compact
                  icon="check-circle-outline"
                  style={styles.actionButton}
                  onPress={() => handleCompleteGoal(goal)}
                >
                  Cumplir
                </Button>
              </>
            )}

            {completed && (
              <Button
                mode="contained-tonal"
                compact
                icon="share-variant-outline"
                style={styles.actionButton}
                onPress={() => openShareDialog(goal)}
              >
                Compartir
              </Button>
            )}

            <IconButton
              icon="pencil-outline"
              size={21}
              onPress={() => openEditDialog(goal)}
            />

            <IconButton
              icon="trash-can-outline"
              size={21}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteGoal(goal)}
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
              Objetivos
            </Text>

            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Marcá metas, seguí avances y compartí logros.
            </Text>
          </View>
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
              style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}
            >
              <Card.Content>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryTextBox}>
                    <Text
                      variant="titleLarge"
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: "900",
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

                <ProgressBar
                  progress={generalProgress / 100}
                  color={theme.colors.primary}
                  style={[
                    styles.summaryProgress,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
              </Card.Content>
            </Card>

            {goals.length === 0 ? (
              <Card
                mode="contained"
                style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}
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
                      🎯
                    </Text>
                  </View>

                  <Text
                    variant="titleLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      textAlign: "center",
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
                    <Text
                      variant="titleLarge"
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onBackground },
                      ]}
                    >
                      En progreso
                    </Text>

                    {activeGoals.map(renderGoalCard)}
                  </>
                )}

                {completedGoals.length > 0 && (
                  <>
                    <Text
                      variant="titleLarge"
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onBackground },
                      ]}
                    >
                      Cumplidos
                    </Text>

                    {completedGoals.map(renderGoalCard)}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {!loading && goals.length > 0 && (
        <FAB
          icon="plus"
          label="Objetivo"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={openCreateDialog}
        />
      )}

      <Portal>
        <Dialog
          visible={goalDialogVisible}
          onDismiss={closeGoalDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>
            {selectedGoal ? "Editar objetivo" : "Nuevo objetivo"}
          </Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.dialogContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                mode="outlined"
                label="Título"
                value={title}
                onChangeText={setTitle}
                placeholder="Ej: Llegar a 80kg en press banca"
                style={styles.input}
              />

              <SegmentedButtons
                value={type}
                onValueChange={handleTypeChange}
                buttons={GOAL_TYPES.map((item) => ({
                  value: item.value,
                  label: item.label,
                  icon: item.icon,
                }))}
                style={styles.segmented}
              />

              <View style={styles.formGrid}>
                <TextInput
                  mode="outlined"
                  label="Actual"
                  value={currentValue}
                  onChangeText={setCurrentValue}
                  keyboardType="decimal-pad"
                  style={styles.formInput}
                />

                <TextInput
                  mode="outlined"
                  label="Meta"
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="decimal-pad"
                  style={styles.formInput}
                />
              </View>

              <TextInput
                mode="outlined"
                label="Unidad"
                value={unit}
                onChangeText={setUnit}
                placeholder="kg, entrenos, días..."
                style={styles.input}
              />
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={saving} onPress={closeGoalDialog}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={handleSaveGoal}
            >
              Guardar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={shareDialogVisible}
          onDismiss={closeShareDialog}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>Compartir objetivo</Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.dialogContent}
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
                Escribí un comentario para acompañar tu logro. Si lo dejás
                vacío, usamos un resumen automático.
              </Text>

              <TextInput
                mode="outlined"
                label="Comentario"
                value={shareComment}
                onChangeText={setShareComment}
                multiline
                numberOfLines={4}
                placeholder="Ej: Después de varias semanas, objetivo cumplido 💪"
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
                  {shareComment.trim() || getDefaultShareText()}
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
              onPress={handleShareGoal}
            >
              Publicar
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
    paddingBottom: 130,
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
    borderRadius: 28,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTextBox: {
    flex: 1,
    marginRight: 12,
  },
  summaryProgress: {
    height: 10,
    borderRadius: 999,
    marginTop: 18,
  },
  emptyCard: {
    borderRadius: 30,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 18,
  },
  emptyButton: {
    borderRadius: 18,
    marginTop: 22,
  },
  buttonContent: {
    height: 50,
  },
  sectionTitle: {
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 26,
    marginBottom: 14,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  goalIcon: {
    margin: 0,
  },
  goalTitleBox: {
    flex: 1,
    marginRight: 10,
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
    marginTop: 14,
    gap: 4,
  },
  smallButton: {
    borderRadius: 14,
  },
  actionButton: {
    borderRadius: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 94,
    borderRadius: 18,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  input: {
    marginBottom: 14,
  },
  segmented: {
    marginBottom: 14,
  },
  formGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  formInput: {
    flex: 1,
  },
  previewBox: {
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
  },
});