import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
  const [commentsPreviewByPost, setCommentsPreviewByPost] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [postDialogVisible, setPostDialogVisible] = useState(false);
  const [postMode, setPostMode] = useState("text");
  const [postText, setPostText] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [posting, setPosting] = useState(false);

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);

  const [commentsDialogVisible, setCommentsDialogVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);

  const [likingPostId, setLikingPostId] = useState(null);

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

  const dangerSoft = theme.dark
    ? "rgba(248,113,113,0.12)"
    : "rgba(220,38,38,0.07)";

  const dangerColor = theme.dark ? "#FCA5A5" : "#B91C1C";

  const successSoft = theme.dark
    ? "rgba(34,197,94,0.13)"
    : "rgba(22,163,74,0.08)";

  const successColor = theme.dark ? "#86EFAC" : "#15803D";

  const getUserPostData = () => {
    return {
      userName: userProfile?.name || user?.displayName || "Usuario Forte",
      userPhotoURL: userProfile?.photoURL || user?.photoURL || null,
    };
  };

  const loadCommentsPreviews = useCallback(async (loadedPosts) => {
    try {
      const postsWithComments = loadedPosts.filter((post) => {
        return Number(post.commentsCount) > 0;
      });

      if (postsWithComments.length === 0) {
        setCommentsPreviewByPost({});
        return;
      }

      const entries = await Promise.all(
        postsWithComments.map(async (post) => {
          try {
            const response = await getPostComments({
              postId: post.id,
            });

            return [post.id, response.slice(0, 2)];
          } catch {
            return [post.id, []];
          }
        })
      );

      setCommentsPreviewByPost(Object.fromEntries(entries));
    } catch {
      setCommentsPreviewByPost({});
    }
  }, []);

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

        await loadCommentsPreviews(response);

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
    [loadCommentsPreviews, syncUnreadCount, user?.uid]
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

  const openDeleteDialog = (post) => {
    if (post.userId !== user?.uid) {
      Alert.alert(
        "No permitido",
        "Solo podés eliminar tus propias publicaciones."
      );
      return;
    }

    setPostToDelete(post);
    setDeleteDialogVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deletingPostId) return;

    setDeleteDialogVisible(false);
    setPostToDelete(null);
  };

  const handleConfirmDeletePost = async () => {
    try {
      if (!postToDelete?.id) return;

      setDeletingPostId(postToDelete.id);

      await deletePost({
        uid: user.uid,
        postId: postToDelete.id,
      });

      setPosts((prev) => prev.filter((item) => item.id !== postToDelete.id));

      setCommentsPreviewByPost((prev) => {
        const next = { ...prev };
        delete next[postToDelete.id];
        return next;
      });

      closeDeleteDialog();

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

      setCommentsPreviewByPost((prev) => ({
        ...prev,
        [post.id]: response.slice(0, 2),
      }));
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

      setCommentsPreviewByPost((prev) => ({
        ...prev,
        [selectedPost.id]: response.slice(0, 2),
      }));

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
          {
            backgroundColor: mutedSurface,
            borderColor: premiumBorder,
          },
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

          <View style={styles.weeklyDonutBox}>
            <ProgressDonut
              progress={weeklyProgress}
              size={82}
              strokeWidth={9}
              label=""
              subLabel=""
            />

            <View style={styles.weeklyDonutCenter}>
              <Text
                variant="titleMedium"
                style={{
                  color: theme.colors.primary,
                  fontWeight: "900",
                  textAlign: "center",
                  includeFontPadding: false,
                  lineHeight: 22,
                }}
              >
                {weeklyProgress}%
              </Text>
            </View>
          </View>
        </View>

        <ProgressBar
          progress={weeklyProgress / 100}
          color={theme.colors.primary}
          style={[
            styles.weeklyProgressBar,
            {
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.08)",
            },
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
          {
            backgroundColor: successSoft,
            borderColor: theme.dark
              ? "rgba(134,239,172,0.22)"
              : "rgba(22,163,74,0.16)",
          },
        ]}
      >
        <View style={styles.goalCompletedHeader}>
          <View
            style={[
              styles.goalCompletedIcon,
              { backgroundColor: successColor },
            ]}
          >
            <IconButton
              icon="check-bold"
              size={20}
              iconColor={theme.colors.background}
              style={styles.goalCompletedIconButton}
            />
          </View>

          <View style={styles.goalCompletedTextBox}>
            <Text
              variant="titleMedium"
              numberOfLines={2}
              style={{
                color: theme.colors.onSurface,
                fontWeight: "900",
                lineHeight: 22,
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

          <View
            style={[
              styles.completedBadge,
              {
                backgroundColor: successColor,
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{
                color: theme.colors.background,
                fontWeight: "900",
              }}
            >
              OK
            </Text>
          </View>
        </View>

        <ProgressBar
          progress={progress / 100}
          color={successColor}
          style={[
            styles.goalCompletedProgress,
            {
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(15,23,42,0.08)",
            },
          ]}
        />

        <View style={styles.goalCompletedStats}>
          <View style={styles.statItem}>
            <Text
              variant="titleMedium"
              style={{ color: successColor, fontWeight: "900" }}
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
              style={{ color: successColor, fontWeight: "900" }}
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
              style={{ color: successColor, fontWeight: "900" }}
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
            {
              backgroundColor: mutedSurface,
              borderColor: premiumBorder,
            },
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

  const renderCommentsPreview = (post) => {
    const previewComments = commentsPreviewByPost[post.id] || [];
    const totalComments = Number(post.commentsCount) || 0;

    if (previewComments.length === 0 && totalComments === 0) return null;

    return (
      <View
        style={[
          styles.commentsPreviewBox,
          {
            backgroundColor: mutedSurface,
            borderColor: premiumBorder,
          },
        ]}
      >
        {previewComments.map((comment) => (
          <View key={comment.id} style={styles.previewCommentItem}>
            {comment.userPhotoURL ? (
              <Avatar.Image
                size={30}
                source={{ uri: comment.userPhotoURL }}
              />
            ) : (
              <Avatar.Text
                size={30}
                label={getInitial(comment.userName)}
                style={{ backgroundColor: softPrimary }}
                color={theme.colors.primary}
                labelStyle={{ fontWeight: "900" }}
              />
            )}

            <View style={styles.previewCommentTextBox}>
              <Text
                variant="labelSmall"
                numberOfLines={1}
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: "900",
                }}
              >
                {comment.userName || "Usuario Forte"}
              </Text>

              <Text
                variant="bodySmall"
                numberOfLines={2}
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 1,
                  lineHeight: 18,
                }}
              >
                {comment.text}
              </Text>
            </View>
          </View>
        ))}

        {totalComments > previewComments.length && (
          <TouchableRipple
            borderless
            onPress={() => openComments(post)}
            style={styles.moreCommentsButton}
          >
            <View style={styles.moreCommentsContent}>
              <IconButton
                icon="comment-multiple-outline"
                size={15}
                iconColor={theme.colors.primary}
                style={styles.moreCommentsIcon}
              />

              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.primary,
                  fontWeight: "900",
                }}
              >
                Ver {totalComments - previewComments.length} comentario
                {totalComments - previewComments.length === 1 ? "" : "s"} más
              </Text>
            </View>
          </TouchableRipple>
        )}
      </View>
    );
  };

  const renderPostModeOption = ({ value, label, description, icon, onPress }) => {
    const selected =
      value === "text"
        ? postMode === "text"
        : postMode === "photo" && selectedImageUri;

    return (
      <TouchableRipple
        borderless
        disabled={posting}
        onPress={onPress}
        style={[
          styles.postModeOption,
          {
            backgroundColor: selected ? softPrimary : mutedSurface,
            borderColor: selected ? theme.colors.primary : premiumBorder,
            opacity: posting ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.postModeOptionContent}>
          <View
            style={[
              styles.postModeIconBox,
              {
                backgroundColor: selected
                  ? theme.colors.primary
                  : theme.colors.surface,
                borderColor: selected ? theme.colors.primary : premiumBorder,
              },
            ]}
          >
            <IconButton
              icon={icon}
              size={19}
              iconColor={
                selected
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              }
              style={styles.postModeIcon}
            />
          </View>

          <View style={styles.postModeTextBox}>
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.primary : theme.colors.onSurface,
                fontWeight: "900",
              }}
            >
              {label}
            </Text>

            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 1,
              }}
            >
              {description}
            </Text>
          </View>

          {selected && (
            <View
              style={[
                styles.modeSelectedBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <IconButton
                icon="check"
                size={12}
                iconColor={theme.colors.onPrimary}
                style={styles.modeSelectedIcon}
              />
            </View>
          )}
        </View>
      </TouchableRipple>
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
              icon="account-group-outline"
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
              FORTE SOCIAL
            </Text>
          </View>

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
        </View>

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
                      },
                    ]}
                  >
                    <IconButton
                      icon="message-text-outline"
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
                      {
                        backgroundColor: premiumSurface,
                        borderColor: premiumBorder,
                      },
                    ]}
                  >
                    <Card.Content style={styles.postCardContent}>
                      <View style={styles.postHeader}>
                        {post.userPhotoURL ? (
                          <Avatar.Image
                            size={48}
                            source={{ uri: post.userPhotoURL }}
                          />
                        ) : (
                          <Avatar.Text
                            size={48}
                            label={getInitial(post.userName)}
                            style={{
                              backgroundColor: softPrimary,
                            }}
                            color={theme.colors.primary}
                            labelStyle={{ fontWeight: "900" }}
                          />
                        )}

                        <View style={styles.postUserBox}>
                          <Text
                            variant="titleMedium"
                            numberOfLines={1}
                            style={{
                              color: theme.colors.onSurface,
                              fontWeight: "900",
                              letterSpacing: -0.2,
                            }}
                          >
                            {post.userName || "Usuario Forte"}
                          </Text>

                          <Text
                            variant="bodySmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 2,
                            }}
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
                            iconColor={dangerColor}
                            onPress={() => openDeleteDialog(post)}
                            style={[
                              styles.deletePostButton,
                              {
                                backgroundColor: dangerSoft,
                              },
                            ]}
                          />
                        ) : (
                          <View
                            style={[
                              styles.postTypeBadge,
                              {
                                backgroundColor: softPrimary,
                              },
                            ]}
                          >
                            <IconButton
                              icon={typeData.icon}
                              size={15}
                              iconColor={theme.colors.primary}
                              style={styles.postTypeIcon}
                            />

                            <Text
                              variant="labelSmall"
                              numberOfLines={1}
                              style={{
                                color: theme.colors.primary,
                                fontWeight: "900",
                              }}
                            >
                              {typeData.label}
                            </Text>
                          </View>
                        )}
                      </View>

                      {isMyPost && (
                        <View style={styles.myPostChipRow}>
                          <Chip
                            compact
                            icon={typeData.icon}
                            style={{
                              backgroundColor: softPrimary,
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
                              backgroundColor: mutedSurface,
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
                          { borderColor: premiumBorder },
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
                          style={styles.socialActionButton}
                        >
                          {post.likesCount || 0}
                        </Button>

                        <Button
                          mode="text"
                          compact
                          icon="comment-outline"
                          textColor={theme.colors.onSurfaceVariant}
                          onPress={() => openComments(post)}
                          style={styles.socialActionButton}
                        >
                          {post.commentsCount || 0}
                        </Button>
                      </View>

                      {renderCommentsPreview(post)}
                    </Card.Content>
                  </Card>
                );
              })
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
            visible={postDialogVisible}
            onDismiss={closeCreatePost}
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
                {posting ? (
                  <ActivityIndicator size={24} color={theme.colors.primary} />
                ) : (
                  <IconButton
                    icon="plus"
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
                Nueva publicación
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
                Compartí una actualización, una foto o tu progreso.
              </Text>
            </View>

            <Dialog.ScrollArea style={styles.postDialogScrollArea}>
              <ScrollView
                contentContainerStyle={styles.postDialogContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.postModeGrid}>
                  {renderPostModeOption({
                    value: "text",
                    label: "Texto",
                    description: "Publicación simple",
                    icon: "message-text-outline",
                    onPress: () => {
                      setPostMode("text");
                      setSelectedImageUri(null);
                    },
                  })}

                  {renderPostModeOption({
                    value: "gallery",
                    label: "Galería",
                    description: "Elegir imagen",
                    icon: "image-outline",
                    onPress: handlePickImage,
                  })}

                  {renderPostModeOption({
                    value: "camera",
                    label: "Cámara",
                    description: "Sacar foto",
                    icon: "camera-outline",
                    onPress: handleTakePhoto,
                  })}
                </View>

                {selectedImageUri && (
                  <View
                    style={[
                      styles.previewImageBox,
                      {
                        backgroundColor: mutedSurface,
                        borderColor: premiumBorder,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: selectedImageUri }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />

                    <Button
                      mode="contained-tonal"
                      compact
                      icon="close"
                      style={styles.removeImageButton}
                      onPress={() => {
                        setSelectedImageUri(null);
                        setPostMode("text");
                      }}
                    >
                      Quitar imagen
                    </Button>
                  </View>
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
                  outlineStyle={{ borderRadius: 16 }}
                />
              </ScrollView>
            </Dialog.ScrollArea>

            <View style={styles.dialogActionsCustom}>
              <Button
                mode="outlined"
                disabled={posting}
                onPress={closeCreatePost}
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
                loading={posting}
                disabled={posting}
                onPress={handleCreatePost}
                style={styles.dialogActionButton}
                contentStyle={styles.dialogActionContent}
              >
                Publicar
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
                Eliminar publicación
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
                Esta publicación se eliminará de Social. Esta acción no se puede
                deshacer.
              </Text>

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
                    marginBottom: 6,
                  }}
                >
                  PUBLICACIÓN
                </Text>

                <Text
                  variant="bodyMedium"
                  numberOfLines={3}
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: "800",
                    textAlign: "center",
                    lineHeight: 21,
                  }}
                >
                  {postToDelete?.text?.trim()
                    ? postToDelete.text
                    : postToDelete?.imageUrl
                    ? "Publicación con imagen"
                    : "Publicación de Forte"}
                </Text>
              </View>

              <View style={styles.deleteActions}>
                <Button
                  mode="outlined"
                  disabled={!!deletingPostId}
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
                  loading={!!deletingPostId}
                  disabled={!!deletingPostId}
                  onPress={handleConfirmDeletePost}
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
            visible={commentsDialogVisible}
            onDismiss={closeComments}
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
                  icon="comment-outline"
                  size={25}
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
                Comentarios
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
                Leé y respondé la publicación.
              </Text>
            </View>

            <Dialog.ScrollArea style={styles.commentsDialogScrollArea}>
              <ScrollView
                contentContainerStyle={styles.commentsDialogContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
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
                  <View
                    style={[
                      styles.noCommentsBox,
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
                        {
                          borderColor: premiumBorder,
                          backgroundColor: mutedSurface,
                        },
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
                          style={{ backgroundColor: softPrimary }}
                          color={theme.colors.primary}
                          labelStyle={{ fontWeight: "900" }}
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
                  outlineStyle={{ borderRadius: 16 }}
                />
              </ScrollView>
            </Dialog.ScrollArea>

            <View style={styles.dialogActionsCustom}>
              <Button
                mode="outlined"
                disabled={commentPosting}
                onPress={closeComments}
                style={[
                  styles.dialogActionButton,
                  {
                    borderColor: premiumBorder,
                  },
                ]}
                contentStyle={styles.dialogActionContent}
              >
                Cerrar
              </Button>

              <Button
                mode="contained"
                icon="send"
                loading={commentPosting}
                disabled={commentPosting}
                onPress={handleCreateComment}
                style={styles.dialogActionButton}
                contentStyle={styles.dialogActionContent}
              >
                Comentar
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
    paddingBottom: 110,
  },

  header: {
    marginBottom: 18,
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
    marginBottom: 18,
  },

  emptyIconButton: {
    margin: 0,
  },

  postCard: {
    borderRadius: 28,
    marginBottom: 16,
    borderWidth: 1,
  },

  postCardContent: {
    paddingVertical: 16,
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

  deletePostButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    margin: 0,
  },

  postTypeBadge: {
    maxWidth: 126,
    height: 32,
    borderRadius: 16,
    paddingRight: 10,
    paddingLeft: 2,
    flexDirection: "row",
    alignItems: "center",
  },

  postTypeIcon: {
    width: 28,
    height: 28,
    margin: 0,
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
    borderWidth: 1,
  },

  weeklyTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  weeklyTextBox: {
    flex: 1,
    marginRight: 12,
  },

  weeklyDonutBox: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  weeklyDonutCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 1,
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
    borderWidth: 1,
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

  goalCompletedIconButton: {
    margin: 0,
  },

  goalCompletedTextBox: {
    flex: 1,
    marginRight: 10,
  },

  completedBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
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
    borderWidth: 1,
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

  socialActionButton: {
    borderRadius: 14,
  },

  commentsPreviewBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },

  previewCommentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  previewCommentTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  moreCommentsButton: {
    borderRadius: 14,
    overflow: "hidden",
    alignSelf: "flex-start",
  },

  moreCommentsContent: {
    minHeight: 32,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  moreCommentsIcon: {
    margin: 0,
    width: 28,
    height: 28,
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

  postDialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: 460,
  },

  postDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 26,
  },

  postModeGrid: {
    gap: 10,
    marginBottom: 14,
  },

  postModeOption: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },

  postModeOptionContent: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  postModeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  postModeIcon: {
    margin: 0,
  },

  postModeTextBox: {
    flex: 1,
  },

  modeSelectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  modeSelectedIcon: {
    margin: 0,
  },

  previewImageBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },

  previewImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: "#00000010",
  },

  removeImageButton: {
    borderRadius: 14,
    marginTop: 10,
    alignSelf: "flex-start",
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

  commentsDialogScrollArea: {
    paddingHorizontal: 0,
    maxHeight: 430,
  },

  commentsDialogContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 26,
  },

  commentsLoadingBox: {
    paddingVertical: 24,
    alignItems: "center",
  },

  noCommentsBox: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },

  commentItem: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    marginBottom: 10,
  },

  commentTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  commentInput: {
    marginTop: 6,
  },
});