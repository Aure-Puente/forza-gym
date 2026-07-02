import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Dialog,
  FAB,
  IconButton,
  ProgressBar,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";

import ProgressDonut from "../components/charts/ProgressDonut";

import { useAuth } from "../context/AuthContext";

import {
  createPhotoPost,
  createPostComment,
  createTextPost,
  deletePost,
  getPostComments,
  getPosts,
  togglePostLike,
} from "../services/postsService";

const formatPostDate = (date) => {
  if (!date) return "Ahora";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat("es-AR").format(Number(value) || 0);
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

const getInitial = (name) => {
  return String(name || "F").charAt(0).toUpperCase();
};

const getPostTime = (post) => {
  if (post?.createdDate instanceof Date) {
    return post.createdDate.getTime();
  }

  if (post?.createdAt?.toDate) {
    return post.createdAt.toDate().getTime();
  }

  return 0;
};

const getLastSeenKey = (uid) => {
  return `@forte_social_last_seen_${uid}`;
};

export default function SocialScreen({
  updateUnreadSocialCount,
  clearUnreadSocialCount,
}) {
  const theme = useTheme();
  const { user, userProfile } = useAuth();

  const isFocusedRef = useRef(false);

  const [posts, setPosts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [postDialogVisible, setPostDialogVisible] = useState(false);
  const [postMode, setPostMode] = useState("text");
  const [postText, setPostText] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [posting, setPosting] = useState(false);

  const [commentsDialogVisible, setCommentsDialogVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);

  const [likingPostId, setLikingPostId] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  const [error, setError] = useState("");

  const getUserPostData = () => {
    return {
      userName: userProfile?.name || user?.displayName || "Usuario Forte",
      userPhotoURL: userProfile?.photoURL || user?.photoURL || null,
    };
  };

  const syncUnreadCount = useCallback(
    async ({ loadedPosts, markAsSeen = false }) => {
      if (!user?.uid) return;

      const otherPosts = loadedPosts.filter((post) => post.userId !== user.uid);

      const latestOtherPostTime = otherPosts.reduce((max, post) => {
        return Math.max(max, getPostTime(post));
      }, 0);

      const lastSeenKey = getLastSeenKey(user.uid);

      if (markAsSeen) {
        if (latestOtherPostTime > 0) {
          await AsyncStorage.setItem(lastSeenKey, String(latestOtherPostTime));
        }

        clearUnreadSocialCount?.();
        return;
      }

      const savedLastSeen = await AsyncStorage.getItem(lastSeenKey);

      if (!savedLastSeen) {
        if (latestOtherPostTime > 0) {
          await AsyncStorage.setItem(lastSeenKey, String(latestOtherPostTime));
        }

        updateUnreadSocialCount?.(0);
        return;
      }

      const lastSeenTime = Number(savedLastSeen) || 0;

      const unreadCount = otherPosts.filter((post) => {
        return getPostTime(post) > lastSeenTime;
      }).length;

      updateUnreadSocialCount?.(unreadCount);
    },
    [clearUnreadSocialCount, updateUnreadSocialCount, user?.uid]
  );

  const loadPosts = useCallback(
    async ({ markAsSeen = false, silent = false } = {}) => {
      try {
        if (!silent) {
          setError("");
        }

        if (!user?.uid) return;

        const response = await getPosts({
          uid: user.uid,
          maxResults: 50,
        });

        setPosts(response);

        await syncUnreadCount({
          loadedPosts: response,
          markAsSeen,
        });
      } catch (err) {
        if (!silent) {
          setError(err?.message || "No se pudieron cargar las publicaciones.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [syncUnreadCount, user?.uid]
  );

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      loadPosts({
        markAsSeen: true,
        silent: false,
      });

      return () => {
        isFocusedRef.current = false;
      };
    }, [loadPosts])
  );

  useEffect(() => {
    if (!user?.uid) return;

    const interval = setInterval(() => {
      if (isFocusedRef.current) return;

      loadPosts({
        markAsSeen: false,
        silent: true,
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [loadPosts, user?.uid]);

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadPosts({
      markAsSeen: true,
      silent: false,
    });
  };

  const resetPostForm = () => {
    setPostMode("text");
    setPostText("");
    setSelectedImageUri(null);
  };

  const openCreatePost = () => {
    resetPostForm();
    setPostDialogVisible(true);
  };

  const closeCreatePost = () => {
    if (posting) return;

    setPostDialogVisible(false);
    resetPostForm();
  };

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitamos acceso a tu galería para elegir una foto."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;

      const imageUri = result.assets?.[0]?.uri;

      if (!imageUri) return;

      setSelectedImageUri(imageUri);
      setPostMode("photo");
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo elegir la imagen.");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitamos acceso a la cámara para sacar una foto."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;

      const imageUri = result.assets?.[0]?.uri;

      if (!imageUri) return;

      setSelectedImageUri(imageUri);
      setPostMode("photo");
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo sacar la foto.");
    }
  };

  const handleCreatePost = async () => {
    try {
      if (postMode === "text" && !postText.trim()) {
        Alert.alert("Publicación vacía", "Escribí algo para publicar.");
        return;
      }

      if (postMode === "photo" && !selectedImageUri) {
        Alert.alert("Sin foto", "Elegí o sacá una foto para publicar.");
        return;
      }

      setPosting(true);

      const { userName, userPhotoURL } = getUserPostData();

      if (postMode === "photo") {
        await createPhotoPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          text: postText,
          imageUri: selectedImageUri,
        });
      } else {
        await createTextPost({
          uid: user.uid,
          userName,
          userPhotoURL,
          text: postText,
        });
      }

      setPostDialogVisible(false);
      resetPostForm();

      await loadPosts({
        markAsSeen: true,
        silent: false,
      });
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "No se pudo crear la publicación."
      );
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (post) => {
    if (post.userId !== user?.uid) {
      Alert.alert(
        "No permitido",
        "Solo podés eliminar tus propias publicaciones."
      );
      return;
    }

    Alert.alert(
      "Eliminar publicación",
      "¿Querés eliminar esta publicación? Esta acción no se puede deshacer.",
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
              setDeletingPostId(post.id);

              await deletePost({
                uid: user.uid,
                postId: post.id,
              });

              setPosts((prev) => prev.filter((item) => item.id !== post.id));

              await loadPosts({
                markAsSeen: true,
                silent: true,
              });
            } catch (err) {
              Alert.alert(
                "Error",
                err?.message || "No se pudo eliminar la publicación."
              );
            } finally {
              setDeletingPostId(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleLike = async (post) => {
    try {
      setLikingPostId(post.id);

      const response = await togglePostLike({
        uid: user.uid,
        postId: post.id,
      });

      setPosts((prev) =>
        prev.map((item) => {
          if (item.id !== post.id) return item;

          const currentLikes = Number(item.likesCount) || 0;

          return {
            ...item,
            likedByMe: response.liked,
            likesCount: response.liked
              ? currentLikes + 1
              : Math.max(0, currentLikes - 1),
          };
        })
      );
    } catch (err) {
      Alert.alert("Error", err?.message || "No se pudo actualizar el like.");
    } finally {
      setLikingPostId(null);
    }
  };

  const openComments = async (post) => {
    try {
      setSelectedPost(post);
      setCommentText("");
      setComments([]);
      setCommentsDialogVisible(true);
      setCommentsLoading(true);

      const response = await getPostComments({
        postId: post.id,
      });

      setComments(response);
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "No se pudieron cargar los comentarios."
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeComments = () => {
    if (commentPosting) return;

    setCommentsDialogVisible(false);
    setSelectedPost(null);
    setComments([]);
    setCommentText("");
  };

  const handleCreateComment = async () => {
    try {
      if (!selectedPost?.id) return;

      if (!commentText.trim()) {
        Alert.alert("Comentario vacío", "Escribí un comentario.");
        return;
      }

      setCommentPosting(true);

      const { userName, userPhotoURL } = getUserPostData();

      await createPostComment({
        uid: user.uid,
        postId: selectedPost.id,
        userName,
        userPhotoURL,
        text: commentText,
      });

      setCommentText("");

      const response = await getPostComments({
        postId: selectedPost.id,
      });

      setComments(response);

      setPosts((prev) =>
        prev.map((item) =>
          item.id === selectedPost.id
            ? {
                ...item,
                commentsCount: (Number(item.commentsCount) || 0) + 1,
              }
            : item
        )
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err?.message || "No se pudo publicar el comentario."
      );
    } finally {
      setCommentPosting(false);
    }
  };

  const renderWeeklyProgressCard = (post) => {
    const weeklyProgress = Number(post.stats?.weeklyProgress) || 0;
    const weeklyTrainedDays = Number(post.stats?.weeklyTrainedDays) || 0;
    const weeklyGoalDays = Number(post.stats?.weeklyGoalDays) || 0;
    const weeklyVolume = Number(post.stats?.weeklyVolume) || 0;
    const weeklyCompletedExercises =
      Number(post.stats?.weeklyCompletedExercises) || 0;

    return (
      <View
        style={[
          styles.weeklyBox,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <View style={styles.weeklyTopRow}>
          <View style={styles.weeklyTextBox}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: "900" }}
            >
              Resumen semanal
            </Text>

            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {weeklyTrainedDays}/{weeklyGoalDays} días completados ·{" "}
              {formatNumber(weeklyVolume)} kg movidos
            </Text>
          </View>

          <ProgressDonut
            progress={weeklyProgress}
            size={82}
            strokeWidth={9}
            label={`${weeklyProgress}%`}
            subLabel=""
          />
        </View>

        <ProgressBar
          progress={weeklyProgress / 100}
          color={theme.colors.primary}
          style={[
            styles.weeklyProgressBar,
            { backgroundColor: theme.colors.surface },
          ]}
        />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {weeklyTrainedDays}/{weeklyGoalDays}
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Días
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {formatNumber(weeklyVolume)}
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Kg
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {weeklyCompletedExercises}
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Ejercicios
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderGoalCompletedCard = (post) => {
    const goalTitle = post.stats?.goalTitle || "Objetivo";
    const currentValue = Number(post.stats?.currentValue) || 0;
    const targetValue = Number(post.stats?.targetValue) || 0;
    const unit = post.stats?.unit || "";

    const progress =
      targetValue > 0
        ? Math.min(100, Math.round((currentValue / targetValue) * 100))
        : 100;

    return (
      <View
        style={[
          styles.goalCompletedBox,
          { backgroundColor: theme.custom.softPrimary },
        ]}
      >
        <View style={styles.goalCompletedHeader}>
          <View
            style={[
              styles.goalCompletedIcon,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              variant="titleLarge"
              style={{
                color: theme.colors.onPrimary,
                fontWeight: "900",
              }}
            >
              ✓
            </Text>
          </View>

          <View style={styles.goalCompletedTextBox}>
            <Text
              variant="titleMedium"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
              }}
            >
              {goalTitle}
            </Text>

            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 3,
              }}
            >
              Objetivo completado al {progress}%
            </Text>
          </View>

          <Chip
            compact
            icon="trophy-outline"
            style={{ backgroundColor: theme.colors.surface }}
            textStyle={{
              color: theme.colors.primary,
              fontWeight: "900",
            }}
          >
            Cumplido
          </Chip>
        </View>

        <ProgressBar
          progress={progress / 100}
          color={theme.colors.primary}
          style={[
            styles.goalCompletedProgress,
            { backgroundColor: theme.colors.surface },
          ]}
        />

        <View style={styles.goalCompletedStats}>
          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {formatNumber(currentValue)}
              {unit ? ` ${unit}` : ""}
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Alcanzado
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {formatNumber(targetValue)}
              {unit ? ` ${unit}` : ""}
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Meta
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.primary, fontWeight: "900" }}
            >
              {progress}%
            </Text>

            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Progreso
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatsCard = (post) => {
    if (post.type === "weekly_progress") {
      return renderWeeklyProgressCard(post);
    }

    if (post.type === "goal_completed") {
      return renderGoalCompletedCard(post);
    }

    if (post.type === "exercise_progress") {
      return (
        <View
          style={[
            styles.statsBox,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary, fontWeight: "900" }}
              >
                {post.stats?.bestWeight || 0}kg
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Mejor
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary, fontWeight: "900" }}
              >
                {post.stats?.progressWeight > 0 ? "+" : ""}
                {post.stats?.progressWeight || 0}kg
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Progreso
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.primary, fontWeight: "900" }}
              >
                {post.stats?.completedCount || 0}
              </Text>

              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Registros
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return null;
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
          Social
        </Text>

        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Compartí progreso, fotos y entrenamientos con otros usuarios.
        </Text>

        <Button
          mode="contained"
          icon="plus"
          style={styles.createButton}
          contentStyle={styles.buttonContent}
          onPress={openCreatePost}
        >
          Crear publicación
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
              Cargando publicaciones...
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

            {posts.length === 0 ? (
              <Card
                mode="contained"
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Card.Content>
                  <Text
                    variant="titleLarge"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    Todavía no hay publicaciones
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
                    Compartí tu progreso desde Registro o creá una publicación.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              posts.map((post) => {
                const typeData = getPostTypeData(post);
                const isMyPost = post.userId === user?.uid;

                return (
                  <Card
                    key={post.id}
                    mode="contained"
                    style={[
                      styles.postCard,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Card.Content>
                      <View style={styles.postHeader}>
                        {post.userPhotoURL ? (
                          <Avatar.Image
                            size={46}
                            source={{ uri: post.userPhotoURL }}
                          />
                        ) : (
                          <Avatar.Text
                            size={46}
                            label={getInitial(post.userName)}
                            style={{
                              backgroundColor: theme.custom.softPrimary,
                            }}
                            color={theme.colors.primary}
                          />
                        )}

                        <View style={styles.postUserBox}>
                          <Text
                            variant="titleMedium"
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
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {formatPostDate(post.createdDate)}
                          </Text>
                        </View>

                        {isMyPost ? (
                          <IconButton
                            icon="trash-can-outline"
                            size={21}
                            loading={deletingPostId === post.id}
                            disabled={!!deletingPostId}
                            iconColor={theme.colors.error}
                            onPress={() => handleDeletePost(post)}
                          />
                        ) : (
                          <Chip
                            compact
                            icon={typeData.icon}
                            style={{
                              backgroundColor: theme.custom.softPrimary,
                            }}
                            textStyle={{
                              color: theme.colors.primary,
                              fontWeight: "800",
                            }}
                          >
                            {typeData.label}
                          </Chip>
                        )}
                      </View>

                      {isMyPost && (
                        <View style={styles.myPostChipRow}>
                          <Chip
                            compact
                            icon={typeData.icon}
                            style={{
                              backgroundColor: theme.custom.softPrimary,
                            }}
                            textStyle={{
                              color: theme.colors.primary,
                              fontWeight: "800",
                            }}
                          >
                            {typeData.label}
                          </Chip>

                          <Chip
                            compact
                            icon="account-check-outline"
                            style={{
                              backgroundColor: theme.colors.surfaceVariant,
                            }}
                            textStyle={{
                              color: theme.colors.onSurfaceVariant,
                              fontWeight: "800",
                            }}
                          >
                            Tu publicación
                          </Chip>
                        </View>
                      )}

                      {!!post.text && (
                        <Text
                          variant="bodyLarge"
                          style={[
                            styles.postText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {post.text}
                        </Text>
                      )}

                      {!!post.imageUrl && (
                        <Image
                          source={{ uri: post.imageUrl }}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      )}

                      {renderStatsCard(post)}

                      <View
                        style={[
                          styles.postActions,
                          { borderColor: theme.colors.outlineVariant },
                        ]}
                      >
                        <Button
                          mode="text"
                          compact
                          icon={post.likedByMe ? "heart" : "heart-outline"}
                          loading={likingPostId === post.id}
                          disabled={!!likingPostId}
                          textColor={
                            post.likedByMe
                              ? theme.colors.primary
                              : theme.colors.onSurfaceVariant
                          }
                          onPress={() => handleToggleLike(post)}
                        >
                          {post.likesCount || 0}
                        </Button>

                        <Button
                          mode="text"
                          compact
                          icon="comment-outline"
                          textColor={theme.colors.onSurfaceVariant}
                          onPress={() => openComments(post)}
                        >
                          {post.commentsCount || 0}
                        </Button>
                      </View>
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {!loading && posts.length > 0 && (
        <FAB
          icon="plus"
          label="Post"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={openCreatePost}
        />
      )}

      <Portal>
        <Dialog
          visible={postDialogVisible}
          onDismiss={closeCreatePost}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>Nueva publicación</Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.postDialogContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.postOptionsRow}>
                <TouchableRipple
                  borderless
                  onPress={() => {
                    setPostMode("text");
                    setSelectedImageUri(null);
                  }}
                  style={[
                    styles.postOption,
                    {
                      backgroundColor:
                        postMode === "text"
                          ? theme.custom.softPrimary
                          : theme.colors.surfaceVariant,
                      borderColor:
                        postMode === "text"
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.postOptionInner}>
                    <IconButton
                      icon="message-text-outline"
                      size={22}
                      iconColor={
                        postMode === "text"
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                      style={styles.optionIcon}
                    />

                    <Text
                      variant="labelMedium"
                      style={{
                        color:
                          postMode === "text"
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight: "900",
                      }}
                    >
                      Texto
                    </Text>
                  </View>
                </TouchableRipple>

                <TouchableRipple
                  borderless
                  onPress={handlePickImage}
                  style={[
                    styles.postOption,
                    {
                      backgroundColor:
                        postMode === "photo" && selectedImageUri
                          ? theme.custom.softPrimary
                          : theme.colors.surfaceVariant,
                      borderColor:
                        postMode === "photo" && selectedImageUri
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.postOptionInner}>
                    <IconButton
                      icon="image-outline"
                      size={22}
                      iconColor={
                        postMode === "photo" && selectedImageUri
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                      style={styles.optionIcon}
                    />

                    <Text
                      variant="labelMedium"
                      style={{
                        color:
                          postMode === "photo" && selectedImageUri
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight: "900",
                      }}
                    >
                      Galería
                    </Text>
                  </View>
                </TouchableRipple>

                <TouchableRipple
                  borderless
                  onPress={handleTakePhoto}
                  style={[
                    styles.postOption,
                    {
                      backgroundColor:
                        postMode === "photo" && selectedImageUri
                          ? theme.custom.softPrimary
                          : theme.colors.surfaceVariant,
                      borderColor:
                        postMode === "photo" && selectedImageUri
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.postOptionInner}>
                    <IconButton
                      icon="camera-outline"
                      size={22}
                      iconColor={
                        postMode === "photo" && selectedImageUri
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                      style={styles.optionIcon}
                    />

                    <Text
                      variant="labelMedium"
                      style={{
                        color:
                          postMode === "photo" && selectedImageUri
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight: "900",
                      }}
                    >
                      Cámara
                    </Text>
                  </View>
                </TouchableRipple>
              </View>

              {selectedImageUri && (
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}

              <TextInput
                mode="outlined"
                label={
                  postMode === "photo"
                    ? "Comentario opcional"
                    : "¿Qué querés compartir?"
                }
                value={postText}
                onChangeText={setPostText}
                multiline
                numberOfLines={5}
                placeholder={
                  postMode === "photo"
                    ? "Ej: Entrenamiento terminado 💪"
                    : "Ej: Hoy completé piernas y subí peso en sentadilla."
                }
              />
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={posting} onPress={closeCreatePost}>
              Cancelar
            </Button>

            <Button
              mode="contained"
              loading={posting}
              disabled={posting}
              onPress={handleCreatePost}
            >
              Publicar
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={commentsDialogVisible}
          onDismiss={closeComments}
          style={{ backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title>Comentarios</Dialog.Title>

          <Dialog.ScrollArea>
            <ScrollView
              contentContainerStyle={styles.commentsDialogContent}
              keyboardShouldPersistTaps="handled"
            >
              {commentsLoading ? (
                <View style={styles.commentsLoadingBox}>
                  <ActivityIndicator />
                  <Text
                    variant="bodySmall"
                    style={{
                      marginTop: 8,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Cargando comentarios...
                  </Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.noCommentsBox}>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: "900",
                      textAlign: "center",
                    }}
                  >
                    Todavía no hay comentarios
                  </Text>

                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      textAlign: "center",
                      marginTop: 6,
                    }}
                  >
                    Sé el primero en comentar.
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentItem,
                      { borderColor: theme.colors.outlineVariant },
                    ]}
                  >
                    {comment.userPhotoURL ? (
                      <Avatar.Image
                        size={36}
                        source={{ uri: comment.userPhotoURL }}
                      />
                    ) : (
                      <Avatar.Text
                        size={36}
                        label={getInitial(comment.userName)}
                        style={{ backgroundColor: theme.custom.softPrimary }}
                        color={theme.colors.primary}
                      />
                    )}

                    <View style={styles.commentTextBox}>
                      <Text
                        variant="labelLarge"
                        style={{
                          color: theme.colors.onSurface,
                          fontWeight: "900",
                        }}
                      >
                        {comment.userName || "Usuario Forte"}
                      </Text>

                      <Text
                        variant="bodyMedium"
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 2,
                          lineHeight: 20,
                        }}
                      >
                        {comment.text}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              <TextInput
                mode="outlined"
                label="Escribí un comentario"
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={3}
                style={styles.commentInput}
              />
            </ScrollView>
          </Dialog.ScrollArea>

          <Dialog.Actions>
            <Button disabled={commentPosting} onPress={closeComments}>
              Cerrar
            </Button>

            <Button
              mode="contained"
              loading={commentPosting}
              disabled={commentPosting}
              onPress={handleCreateComment}
            >
              Comentar
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
  createButton: {
    borderRadius: 18,
    marginBottom: 18,
  },
  buttonContent: {
    height: 50,
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
  emptyCard: {
    borderRadius: 28,
  },
  postCard: {
    borderRadius: 28,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  postUserBox: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  myPostChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  postText: {
    marginTop: 16,
    lineHeight: 24,
  },
  postImage: {
    width: "100%",
    height: 260,
    borderRadius: 22,
    marginTop: 16,
    backgroundColor: "#00000010",
  },
  weeklyBox: {
    borderRadius: 22,
    padding: 14,
    marginTop: 16,
  },
  weeklyTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weeklyTextBox: {
    flex: 1,
    marginRight: 12,
  },
  weeklyProgressBar: {
    height: 9,
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 14,
  },
  goalCompletedBox: {
    borderRadius: 22,
    padding: 14,
    marginTop: 16,
  },
  goalCompletedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalCompletedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  goalCompletedTextBox: {
    flex: 1,
    marginRight: 10,
  },
  goalCompletedProgress: {
    height: 9,
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 14,
  },
  goalCompletedStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsBox: {
    borderRadius: 22,
    padding: 14,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  postActions: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 94,
    borderRadius: 18,
  },
  postDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  postOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  postOption: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  postOptionInner: {
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  optionIcon: {
    margin: 0,
  },
  previewImage: {
    width: "100%",
    height: 210,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: "#00000010",
  },
  commentsDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  commentsLoadingBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  noCommentsBox: {
    paddingVertical: 24,
  },
  commentItem: {
    borderTopWidth: 1,
    paddingVertical: 12,
    flexDirection: "row",
  },
  commentTextBox: {
    flex: 1,
    marginLeft: 10,
  },
  commentInput: {
    marginTop: 14,
  },
});