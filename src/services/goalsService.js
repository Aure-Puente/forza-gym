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

    const normalizeGoal = (docItem) => {
    const data = docItem.data();

    return {
        id: docItem.id,
        ...data,
        targetValue: Number(data.targetValue) || 0,
        currentValue: Number(data.currentValue) || 0,
        createdDate: getDateFromFirestore(data.createdAt),
        updatedDate: getDateFromFirestore(data.updatedAt),
        completedDate: getDateFromFirestore(data.completedAt),
    };
    };

    export const getGoals = async ({ uid }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    const goalsRef = collection(db, "users", uid, "goals");

    const goalsQuery = query(goalsRef, orderBy("createdAt", "desc"));

    const snapshot = await getDocs(goalsQuery);

    return snapshot.docs.map(normalizeGoal);
    };

    export const createGoal = async ({
    uid,
    title,
    type,
    targetValue,
    currentValue,
    unit,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!title?.trim()) {
        throw new Error("Ingresá un título para el objetivo.");
    }

    const cleanTarget = Number(targetValue) || 0;
    const cleanCurrent = Number(currentValue) || 0;
    const completed = cleanTarget > 0 && cleanCurrent >= cleanTarget;

    const goalsRef = collection(db, "users", uid, "goals");

    const docRef = await addDoc(goalsRef, {
        title: title.trim(),
        type: type || "custom",
        targetValue: cleanTarget,
        currentValue: cleanCurrent,
        unit: unit?.trim() || "",
        completed,
        completedAt: completed ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
    };

    export const updateGoal = async ({
    uid,
    goalId,
    title,
    type,
    targetValue,
    currentValue,
    unit,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!goalId) {
        throw new Error("No se encontró el objetivo.");
    }

    if (!title?.trim()) {
        throw new Error("Ingresá un título para el objetivo.");
    }

    const cleanTarget = Number(targetValue) || 0;
    const cleanCurrent = Number(currentValue) || 0;
    const completed = cleanTarget > 0 && cleanCurrent >= cleanTarget;

    const goalRef = doc(db, "users", uid, "goals", goalId);

    await updateDoc(goalRef, {
        title: title.trim(),
        type: type || "custom",
        targetValue: cleanTarget,
        currentValue: cleanCurrent,
        unit: unit?.trim() || "",
        completed,
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
    });
    };

    export const updateGoalProgress = async ({
    uid,
    goalId,
    currentValue,
    targetValue,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!goalId) {
        throw new Error("No se encontró el objetivo.");
    }

    const cleanCurrent = Number(currentValue) || 0;
    const cleanTarget = Number(targetValue) || 0;
    const completed = cleanTarget > 0 && cleanCurrent >= cleanTarget;

    const goalRef = doc(db, "users", uid, "goals", goalId);

    await updateDoc(goalRef, {
        currentValue: cleanCurrent,
        completed,
        completedAt: completed ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
    });
    };

    export const markGoalCompleted = async ({ uid, goalId, targetValue }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!goalId) {
        throw new Error("No se encontró el objetivo.");
    }

    const cleanTarget = Number(targetValue) || 0;

    const goalRef = doc(db, "users", uid, "goals", goalId);

    await updateDoc(goalRef, {
        currentValue: cleanTarget,
        completed: true,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    };

    export const deleteGoal = async ({ uid, goalId }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!goalId) {
        throw new Error("No se encontró el objetivo.");
    }

    const goalRef = doc(db, "users", uid, "goals", goalId);

    await deleteDoc(goalRef);
};