//Importaciones:
import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

//JS:
export const createWorkoutSession = async ({
    uid,
    dayId,
    dayName,
    durationSeconds,
    exercises,
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    const completedExercisesList = exercises.filter((item) => item.completed);

    const totalVolume = completedExercisesList.reduce((total, exercise) => {
        const sets = Number(exercise.sets) || 0;
        const reps = Number(exercise.reps) || 0;
        const weight = Number(exercise.weight) || 0;

        return total + sets * reps * weight;
    }, 0);

    const sessionsRef = collection(db, "users", uid, "workoutSessions");

    const sessionData = {
        dayId,
        dayName,
        durationSeconds: Number(durationSeconds) || 0,
        totalExercises: exercises.length,
        completedExercises: completedExercisesList.length,
        totalVolume,
        exercisesSnapshot: exercises.map((exercise) => ({
        exerciseId: exercise.id,
        name: exercise.name || "",
        sets: Number(exercise.sets) || 0,
        reps: Number(exercise.reps) || 0,
        weight: Number(exercise.weight) || 0,
        restSeconds: Number(exercise.restSeconds) || 0,
        completed: !!exercise.completed,
        notes: exercise.notes || "",
        })),
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(sessionsRef, sessionData);

    return {
        id: docRef.id,
        ...sessionData,
    };
    };

    export const resetExercisesCompletion = async ({ uid, dayId, exercises }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    if (!dayId) {
        throw new Error("No se encontró el día de entrenamiento.");
    }

    if (!Array.isArray(exercises) || exercises.length === 0) {
        return;
    }

    const batch = writeBatch(db);

    exercises.forEach((exercise) => {
        const exerciseRef = doc(
        db,
        "users",
        uid,
        "trainingDays",
        dayId,
        "exercises",
        exercise.id
        );

        batch.update(exerciseRef, {
        completed: false,
        updatedAt: serverTimestamp(),
        });
    });

    await batch.commit();
    };