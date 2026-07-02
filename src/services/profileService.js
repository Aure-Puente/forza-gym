//Importaciones:
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import * as FileSystem from "expo-file-system/legacy";
import { auth, db } from "../firebase/firebaseConfig";

//JS:
const STORAGE_BUCKET = "forte-gym-3b1b4.firebasestorage.app";

export const updateUserName = async ({ uid, name }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!name?.trim()) {
        throw new Error("Ingresá un nombre válido.");
    }

    const cleanName = name.trim();

    if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
        displayName: cleanName,
        });
    }

    const userRef = doc(db, "users", uid);

    await setDoc(
        userRef,
        {
        name: cleanName,
        updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    return cleanName;
    };

    export const uploadProfilePhoto = async ({ uid, imageUri }) => {
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

    const fileName = `profile-${Date.now()}.jpg`;
    const storagePath = `profilePhotos/${uid}/${fileName}`;

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

    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedFilePath}?alt=media&token=${downloadToken}`;

    await updateProfile(currentUser, {
        photoURL: downloadURL,
    });

    const userRef = doc(db, "users", uid);

    await setDoc(
        userRef,
        {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    return downloadURL;
};