//Importaciones:
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

//JS:
const getExercisesCollection = ({ uid, dayId }) => {
    return collection(db, "users", uid, "trainingDays", dayId, "exercises");
    };

    export const getExercises = async ({ uid, dayId }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    const exercisesRef = getExercisesCollection({ uid, dayId });

    const q = query(exercisesRef, orderBy("order", "asc"));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    }));
    };

    export const createExercise = async ({
    uid,
    dayId,
    name,
    sets,
    reps,
    weight,
    restSeconds,
    notes,
    order,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    if (!name?.trim()) {
        throw new Error("Ingresá el nombre del ejercicio.");
    }

    const exercisesRef = getExercisesCollection({ uid, dayId });

    const docRef = await addDoc(exercisesRef, {
        name: name.trim(),
        sets: Number(sets) || 1,
        reps: Number(reps) || 1,
        weight: Number(weight) || 0,
        restSeconds: Number(restSeconds) || 60,
        notes: notes?.trim() || "",
        completed: false,
        order: order || 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const updateExercise = async ({
    uid,
    dayId,
    exerciseId,
    data,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    if (!exerciseId) {
        throw new Error("No se encontró el ejercicio.");
    }

    const exerciseRef = doc(
        db,
        "users",
        uid,
        "trainingDays",
        dayId,
        "exercises",
        exerciseId
    );

    await updateDoc(exerciseRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
    };

    export const updateExerciseFull = async ({
    uid,
    dayId,
    exerciseId,
    name,
    sets,
    reps,
    weight,
    restSeconds,
    notes,
    }) => {
    if (!name?.trim()) {
        throw new Error("Ingresá el nombre del ejercicio.");
    }

    await updateExercise({
        uid,
        dayId,
        exerciseId,
        data: {
        name: name.trim(),
        sets: Number(sets) || 1,
        reps: Number(reps) || 1,
        weight: Number(weight) || 0,
        restSeconds: Number(restSeconds) || 60,
        notes: notes?.trim() || "",
        },
    });
    };

    export const deleteExercise = async ({ uid, dayId, exerciseId }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    if (!exerciseId) {
        throw new Error("No se encontró el ejercicio.");
    }

    const exerciseRef = doc(
        db,
        "users",
        uid,
        "trainingDays",
        dayId,
        "exercises",
        exerciseId
    );

    await deleteDoc(exerciseRef);
};