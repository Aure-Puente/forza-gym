//Importaciones:
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import * as FileSystem from "expo-file-system/legacy";
import { auth, db } from "../firebase/firebaseConfig";

//JS:
const STORAGE_BUCKET = "forte-gym-3b1b4.firebasestorage.app";

const getDateFromFirestore = (value) => {
    if (!value) return null;

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    return null;
    };

    const getSubCollectionCount = async (postId, collectionName) => {
    const subRef = collection(db, "posts", postId, collectionName);
    const snapshot = await getDocs(subRef);

    return snapshot.size;
    };

    const getUserLikeState = async ({ postId, uid }) => {
    if (!uid || !postId) return false;

    const likeRef = doc(db, "posts", postId, "likes", uid);
    const likeSnap = await getDoc(likeRef);

    return likeSnap.exists();
    };

    const getCurrentUserProfile = async (userId) => {
    if (!userId) {
        return {
        name: "Usuario Forte",
        photoURL: null,
        };
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return {
        name: "Usuario Forte",
        photoURL: null,
        };
    }

    const data = userSnap.data();

    return {
        name: data?.name || "Usuario Forte",
        photoURL: data?.photoURL || null,
    };
    };

    const uploadSocialImage = async ({ uid, imageUri }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!imageUri) {
        throw new Error("No se encontró la imagen.");
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("No hay una sesión activa.");
    }

    const token = await currentUser.getIdToken(true);

    const fileName = `social-${Date.now()}.jpg`;
    const storagePath = `socialPosts/${uid}/${fileName}`;

    const uploadUrl =
        `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o` +
        `?name=${encodeURIComponent(storagePath)}`;

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, imageUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "image/jpeg",
        },
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let message = "No se pudo subir la imagen.";

        try {
        const parsedBody = JSON.parse(uploadResult.body);
        message = parsedBody?.error?.message || message;
        } catch (error) {
        message = uploadResult.body || message;
        }

        throw new Error(message);
    }

    const parsedResponse = JSON.parse(uploadResult.body);
    const downloadToken = parsedResponse.downloadTokens;
    const encodedFilePath = encodeURIComponent(storagePath);

    return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedFilePath}?alt=media&token=${downloadToken}`;
    };

    export const getPosts = async ({ uid, maxResults = 40 }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    const postsRef = collection(db, "posts");

    const postsQuery = query(
        postsRef,
        orderBy("createdAt", "desc"),
        limit(maxResults)
    );

    const snapshot = await getDocs(postsQuery);

    const posts = await Promise.all(
        snapshot.docs.map(async (item) => {
        const postId = item.id;
        const data = item.data();

        const authorProfile = await getCurrentUserProfile(data.userId);

        const [likesCount, commentsCount, likedByMe] = await Promise.all([
            getSubCollectionCount(postId, "likes"),
            getSubCollectionCount(postId, "comments"),
            getUserLikeState({ postId, uid }),
        ]);

        return {
            id: postId,
            ...data,
            userName: authorProfile.name || data.userName || "Usuario Forte",
            userPhotoURL: authorProfile.photoURL || data.userPhotoURL || null,
            createdDate: getDateFromFirestore(data.createdAt),
            likesCount,
            commentsCount,
            likedByMe,
        };
        })
    );

    return posts;
    };

    export const createTextPost = async ({
    uid,
    userName,
    userPhotoURL,
    text,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!text?.trim()) {
        throw new Error("Escribí algo para publicar.");
    }

    const postsRef = collection(db, "posts");

    const docRef = await addDoc(postsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        type: "text",
        text: text.trim(),
        stats: {},
        imageUrl: null,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const createPhotoPost = async ({
    uid,
    userName,
    userPhotoURL,
    text,
    imageUri,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!imageUri) {
        throw new Error("Seleccioná una imagen.");
    }

    const imageUrl = await uploadSocialImage({
        uid,
        imageUri,
    });

    const postsRef = collection(db, "posts");

    const docRef = await addDoc(postsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        type: "photo",
        text: text?.trim() || "",
        stats: {},
        imageUrl,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const createProgressPost = async ({
    uid,
    userName,
    userPhotoURL,
    text,
    stats,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!text?.trim()) {
        throw new Error("La publicación no puede estar vacía.");
    }

    const postsRef = collection(db, "posts");

    const docRef = await addDoc(postsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        type: "weekly_progress",
        text: text.trim(),
        stats: {
        weeklyGoalDays: Number(stats?.weeklyGoalDays) || 0,
        weeklyTrainedDays: Number(stats?.weeklyTrainedDays) || 0,
        weeklyProgress: Number(stats?.weeklyProgress) || 0,
        weeklyVolume: Number(stats?.weeklyVolume) || 0,
        weeklyCompletedExercises: Number(stats?.weeklyCompletedExercises) || 0,
        weeklyDurationSeconds: Number(stats?.weeklyDurationSeconds) || 0,
        totalWorkouts: Number(stats?.totalWorkouts) || 0,
        totalVolume: Number(stats?.totalVolume) || 0,
        },
        imageUrl: null,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const createExerciseProgressPost = async ({
    uid,
    userName,
    userPhotoURL,
    exercise,
    text,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!exercise?.name) {
        throw new Error("No se encontró el ejercicio.");
    }

    const progressWeight = Number(exercise.progressWeight) || 0;
    const bestWeight = Number(exercise.bestWeight) || 0;
    const lastWeight = Number(exercise.lastWeight) || 0;

    let fallbackText = "";

    if (progressWeight > 0) {
        fallbackText = `Mejoré ${progressWeight} kg en ${exercise.name}. Mi mejor marca ahora es ${bestWeight} kg 💪`;
    } else if (progressWeight < 0) {
        fallbackText = `Estoy siguiendo mi evolución en ${exercise.name}. Última marca: ${lastWeight} kg 💪`;
    } else {
        fallbackText = `Me mantengo constante en ${exercise.name}. Última marca: ${lastWeight} kg 💪`;
    }

    const finalText = text?.trim() ? text.trim() : fallbackText;

    const postsRef = collection(db, "posts");

    const docRef = await addDoc(postsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        type: "exercise_progress",
        text: finalText,
        stats: {
        exerciseName: exercise.name,
        firstWeight: Number(exercise.firstWeight) || 0,
        lastWeight,
        bestWeight,
        progressWeight,
        completedCount: Number(exercise.completedCount) || 0,
        totalVolume: Number(exercise.totalVolume) || 0,
        },
        imageUrl: null,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const createGoalPost = async ({
    uid,
    userName,
    userPhotoURL,
    goal,
    text,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!goal?.title) {
        throw new Error("No se encontró el objetivo.");
    }

    const unit = goal.unit || "";
    const targetValue = Number(goal.targetValue) || 0;
    const currentValue = Number(goal.currentValue) || 0;

    const fallbackText = `Cumplí mi objetivo en Forte: ${goal.title}. Llegué a ${currentValue}${
        unit ? ` ${unit}` : ""
    } de ${targetValue}${unit ? ` ${unit}` : ""} 💪`;

    const finalText = text?.trim() ? text.trim() : fallbackText;

    const postsRef = collection(db, "posts");

    const docRef = await addDoc(postsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        type: "goal_completed",
        text: finalText,
        stats: {
        goalTitle: goal.title,
        goalType: goal.type || "custom",
        targetValue,
        currentValue,
        unit,
        completed: true,
        },
        imageUrl: null,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const togglePostLike = async ({ uid, postId }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!postId) {
        throw new Error("No se encontró la publicación.");
    }

    const likeRef = doc(db, "posts", postId, "likes", uid);
    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
        await deleteDoc(likeRef);

        return {
        liked: false,
        };
    }

    await setDoc(likeRef, {
        userId: uid,
        createdAt: serverTimestamp(),
    });

    return {
        liked: true,
    };
    };

    export const getPostComments = async ({ postId }) => {
    if (!postId) {
        throw new Error("No se encontró la publicación.");
    }

    const commentsRef = collection(db, "posts", postId, "comments");

    const commentsQuery = query(
        commentsRef,
        orderBy("createdAt", "asc"),
        limit(80)
    );

    const snapshot = await getDocs(commentsQuery);

    const comments = await Promise.all(
        snapshot.docs.map(async (item) => {
        const data = item.data();
        const authorProfile = await getCurrentUserProfile(data.userId);

        return {
            id: item.id,
            ...data,
            userName: authorProfile.name || data.userName || "Usuario Forte",
            userPhotoURL: authorProfile.photoURL || data.userPhotoURL || null,
            createdDate: getDateFromFirestore(data.createdAt),
        };
        })
    );

    return comments;
    };

    export const createPostComment = async ({
    uid,
    postId,
    userName,
    userPhotoURL,
    text,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!postId) {
        throw new Error("No se encontró la publicación.");
    }

    if (!text?.trim()) {
        throw new Error("Escribí un comentario.");
    }

    const commentsRef = collection(db, "posts", postId, "comments");

    const docRef = await addDoc(commentsRef, {
        userId: uid,
        userName: userName || "Usuario Forte",
        userPhotoURL: userPhotoURL || null,
        text: text.trim(),
        createdAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const deletePost = async ({ uid, postId }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!postId) {
        throw new Error("No se encontró la publicación.");
    }

    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
        throw new Error("La publicación ya no existe.");
    }

    const postData = postSnap.data();

    if (postData.userId !== uid) {
        throw new Error("Solo podés eliminar tus propias publicaciones.");
    }

    const likesRef = collection(db, "posts", postId, "likes");
    const commentsRef = collection(db, "posts", postId, "comments");

    const [likesSnapshot, commentsSnapshot] = await Promise.all([
        getDocs(likesRef),
        getDocs(commentsRef),
    ]);

    await Promise.all([
        ...likesSnapshot.docs.map((item) => deleteDoc(item.ref)),
        ...commentsSnapshot.docs.map((item) => deleteDoc(item.ref)),
    ]);

    await deleteDoc(postRef);

    return {
        ok: true,
    };
};