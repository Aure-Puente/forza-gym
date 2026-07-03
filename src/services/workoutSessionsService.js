//Importaciones:
import {
    addDoc,
    collection,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

//JS:
//Helpers:
const padTwo = (value) => {
    return String(value).padStart(2, "0");
    };

    export const getDateKey = (date = new Date()) => {
    const safeDate = date instanceof Date ? date : new Date(date);

    const year = safeDate.getFullYear();
    const month = padTwo(safeDate.getMonth() + 1);
    const day = padTwo(safeDate.getDate());

    return `${year}-${month}-${day}`;
    };

    export const getWeekRange = (baseDate = new Date()) => {
    const date = new Date(baseDate);

    date.setHours(0, 0, 0, 0);

    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const start = new Date(date);
    start.setDate(date.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return {
        start,
        end,
        startKey: getDateKey(start),
        endKey: getDateKey(end),
        weekKey: `${getDateKey(start)}_${getDateKey(end)}`,
    };
    };

    const normalizeFirestoreDate = (value) => {
    if (!value) return null;

    if (value?.toDate) {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate;
    };

    const normalizeSession = (docSnap) => {
    const data = docSnap.data();

    const trainedAt =
        normalizeFirestoreDate(data.trainedAt) ||
        normalizeFirestoreDate(data.createdAt) ||
        null;

    return {
        id: docSnap.id,
        ...data,
        trainedAtDate: trainedAt,
        trainedDateKey: data.trainedDateKey || (trainedAt ? getDateKey(trainedAt) : ""),
    };
    };

    const getUniqueTrainedDays = (sessions = []) => {
    const daysSet = new Set();

    sessions.forEach((session) => {
        if (session.trainedDateKey) {
        daysSet.add(session.trainedDateKey);
        return;
        }

        const trainedAt =
        normalizeFirestoreDate(session.trainedAt) ||
        normalizeFirestoreDate(session.createdAt) ||
        normalizeFirestoreDate(session.trainedAtDate);

        if (trainedAt) {
        daysSet.add(getDateKey(trainedAt));
        }
    });

    return Array.from(daysSet).sort();
    };

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

    if (!Array.isArray(exercises)) {
        throw new Error("No se encontraron ejercicios para guardar.");
    }

    const completedExercisesList = exercises.filter((item) => item.completed);

    const totalVolume = completedExercisesList.reduce((total, exercise) => {
        const sets = Number(exercise.sets) || 0;
        const reps = Number(exercise.reps) || 0;
        const weight = Number(exercise.weight) || 0;

        return total + sets * reps * weight;
    }, 0);

    const now = new Date();
    const weekRange = getWeekRange(now);

    const sessionsRef = collection(db, "users", uid, "workoutSessions");

    const sessionData = {
        dayId,
        dayName: dayName || "Entrenamiento",
        durationSeconds: Number(durationSeconds) || 0,
        totalExercises: exercises.length,
        completedExercises: completedExercisesList.length,
        totalVolume,

        // Fechas útiles para estadísticas semanales:
        trainedAt: Timestamp.fromDate(now),
        trainedDateKey: getDateKey(now),
        weekKey: weekRange.weekKey,
        weekStartKey: weekRange.startKey,
        weekEndKey: weekRange.endKey,

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

    export const getWorkoutSessions = async ({ uid }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    const sessionsRef = collection(db, "users", uid, "workoutSessions");
    const sessionsQuery = query(sessionsRef, orderBy("createdAt", "desc"));

    const snapshot = await getDocs(sessionsQuery);

    return snapshot.docs.map(normalizeSession);
    };

    export const getCurrentWeekWorkoutStats = async ({
    uid,
    weeklyGoal = 3,
    baseDate = new Date(),
    }) => {
    if (!uid) {
        throw new Error("No se encontró el usuario.");
    }

    const sessions = await getWorkoutSessions({ uid });
    const weekRange = getWeekRange(baseDate);

    const currentWeekSessions = sessions.filter((session) => {
        const sessionDate =
        session.trainedAtDate ||
        normalizeFirestoreDate(session.trainedAt) ||
        normalizeFirestoreDate(session.createdAt);

        if (!sessionDate) return false;

        return sessionDate >= weekRange.start && sessionDate <= weekRange.end;
    });

    const trainedDays = getUniqueTrainedDays(currentWeekSessions);
    const trainedDaysCount = trainedDays.length;

    const safeWeeklyGoal = Math.max(1, Number(weeklyGoal) || 3);
    const progress = Math.min(1, trainedDaysCount / safeWeeklyGoal);
    const progressPercent = Math.round(progress * 100);

    const totalVolume = currentWeekSessions.reduce((total, session) => {
        return total + (Number(session.totalVolume) || 0);
    }, 0);

    const completedExercises = currentWeekSessions.reduce((total, session) => {
        return total + (Number(session.completedExercises) || 0);
    }, 0);

    const durationSeconds = currentWeekSessions.reduce((total, session) => {
        return total + (Number(session.durationSeconds) || 0);
    }, 0);

    return {
        weekStart: weekRange.start,
        weekEnd: weekRange.end,
        weekStartKey: weekRange.startKey,
        weekEndKey: weekRange.endKey,
        weekKey: weekRange.weekKey,

        weeklyGoal: safeWeeklyGoal,
        trainedDays,
        trainedDaysCount,
        remainingDays: Math.max(0, safeWeeklyGoal - trainedDaysCount),
        completed: trainedDaysCount >= safeWeeklyGoal,
        progress,
        progressPercent,

        sessions: currentWeekSessions,
        sessionsCount: currentWeekSessions.length,
        totalVolume,
        completedExercises,
        durationSeconds,

        shareTitle: `Completé ${trainedDaysCount}/${safeWeeklyGoal} entrenamientos esta semana`,
        shareText:
        trainedDaysCount >= safeWeeklyGoal
            ? `Semana cumplida en Forte: ${trainedDaysCount}/${safeWeeklyGoal} entrenamientos.`
            : `Esta semana llevo ${trainedDaysCount}/${safeWeeklyGoal} entrenamientos en Forte.`,
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