//Importaciones:
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

//JS:
export const getWorkoutSessions = async ({ uid, maxResults = 80 }) => {
  if (!uid) {
    throw new Error("No se encontró el usuario.");
  }

  const sessionsRef = collection(db, "users", uid, "workoutSessions");

  const q = query(
    sessionsRef,
    orderBy("createdAt", "desc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
};

export const getDateFromFirestore = (value) => {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
};

export const getDateKey = (date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getStartOfWeek = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  const day = date.getDay();

  const diffToMonday = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);

  return date;
};

export const getEndOfWeek = (baseDate = new Date()) => {
  const start = getStartOfWeek(baseDate);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
};

export const getWeekDays = (baseDate = new Date()) => {
  const start = getStartOfWeek(baseDate);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      label: ["L", "M", "X", "J", "V", "S", "D"][index],
      date,
      dateKey: getDateKey(date),
      trained: false,
      sessions: 0,
      volume: 0,
      durationSeconds: 0,
      completedExercises: 0,
    };
  });
};

const getSessionsInRange = ({ sessions, startDate, endDate }) => {
  return sessions.filter((session) => {
    return session.createdDate >= startDate && session.createdDate <= endDate;
  });
};

const sumSessions = (sessions) => {
  return sessions.reduce(
    (acc, session) => {
      acc.workouts += 1;
      acc.volume += Number(session.totalVolume) || 0;
      acc.durationSeconds += Number(session.durationSeconds) || 0;
      acc.completedExercises += Number(session.completedExercises) || 0;

      return acc;
    },
    {
      workouts: 0,
      volume: 0,
      durationSeconds: 0,
      completedExercises: 0,
    }
  );
};

const normalizeExerciseName = (name) => {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const getDisplayExerciseName = (name) => {
  const cleanName = String(name || "").trim();

  if (!cleanName) return "Ejercicio";

  return cleanName
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const buildExerciseProgress = (parsedSessions) => {
  const exerciseMap = {};

  parsedSessions
    .slice()
    .reverse()
    .forEach((session) => {
      const sessionDate = session.createdDate;

      if (!Array.isArray(session.exercisesSnapshot)) return;

      session.exercisesSnapshot.forEach((exercise) => {
        if (!exercise?.completed) return;

        const key = normalizeExerciseName(exercise.name);

        if (!key) return;

        const sets = Number(exercise.sets) || 0;
        const reps = Number(exercise.reps) || 0;
        const weight = Number(exercise.weight) || 0;
        const volume = sets * reps * weight;

        if (!exerciseMap[key]) {
          exerciseMap[key] = {
            key,
            name: getDisplayExerciseName(exercise.name),
            records: [],
            completedCount: 0,
            totalVolume: 0,
            bestWeight: 0,
            firstWeight: weight,
            lastWeight: weight,
            progressWeight: 0,
            firstDate: sessionDate,
            lastDate: sessionDate,
            status: "stable",
          };
        }

        exerciseMap[key].records.push({
          sessionId: session.id,
          sessionDate,
          dayName: session.dayName || "Entrenamiento",
          sets,
          reps,
          weight,
          volume,
        });

        exerciseMap[key].completedCount += 1;
        exerciseMap[key].totalVolume += volume;
        exerciseMap[key].bestWeight = Math.max(
          exerciseMap[key].bestWeight,
          weight
        );
        exerciseMap[key].lastWeight = weight;
        exerciseMap[key].lastDate = sessionDate;
      });
    });

  return Object.values(exerciseMap)
    .map((exercise) => {
      const firstRecord = exercise.records[0];
      const lastRecord = exercise.records[exercise.records.length - 1];

      const firstWeight = Number(firstRecord?.weight) || 0;
      const lastWeight = Number(lastRecord?.weight) || 0;
      const progressWeight = lastWeight - firstWeight;

      let status = "stable";

      if (progressWeight > 0) {
        status = "improved";
      }

      if (progressWeight < 0) {
        status = "down";
      }

      return {
        ...exercise,
        firstWeight,
        lastWeight,
        progressWeight,
        firstDate: firstRecord?.sessionDate || null,
        lastDate: lastRecord?.sessionDate || null,
        status,
      };
    })
    .sort((a, b) => {
      if (b.progressWeight !== a.progressWeight) {
        return b.progressWeight - a.progressWeight;
      }

      return b.bestWeight - a.bestWeight;
    });
};

export const buildRecordStats = ({ sessions, weeklyGoalDays = 1 }) => {
  const safeWeeklyGoalDays = Math.max(1, Number(weeklyGoalDays) || 1);

  const today = new Date();

  const startOfWeek = getStartOfWeek(today);
  const endOfWeek = getEndOfWeek(today);

  const previousWeekDate = new Date(startOfWeek);
  previousWeekDate.setDate(startOfWeek.getDate() - 1);

  const startOfPreviousWeek = getStartOfWeek(previousWeekDate);
  const endOfPreviousWeek = getEndOfWeek(previousWeekDate);

  const weekDays = getWeekDays(today);

  const parsedSessions = sessions
    .map((session) => {
      const createdDate = getDateFromFirestore(session.createdAt);

      return {
        ...session,
        createdDate,
        dateKey: createdDate ? getDateKey(createdDate) : "",
      };
    })
    .filter((session) => !!session.createdDate);

  const weeklySessions = getSessionsInRange({
    sessions: parsedSessions,
    startDate: startOfWeek,
    endDate: endOfWeek,
  });

  const previousWeeklySessions = getSessionsInRange({
    sessions: parsedSessions,
    startDate: startOfPreviousWeek,
    endDate: endOfPreviousWeek,
  });

  const weekMap = weekDays.map((day) => {
    const daySessions = weeklySessions.filter(
      (session) => session.dateKey === day.dateKey
    );

    const totals = sumSessions(daySessions);

    return {
      ...day,
      trained: daySessions.length > 0,
      sessions: daySessions.length,
      volume: totals.volume,
      durationSeconds: totals.durationSeconds,
      completedExercises: totals.completedExercises,
    };
  });

  const trainedDateKeys = new Set(
    weeklySessions.map((session) => session.dateKey)
  );

  const previousTrainedDateKeys = new Set(
    previousWeeklySessions.map((session) => session.dateKey)
  );

  const weeklyTrainedDays = trainedDateKeys.size;
  const previousWeeklyTrainedDays = previousTrainedDateKeys.size;

  const totalWorkouts = parsedSessions.length;

  const totalSummary = sumSessions(parsedSessions);
  const weeklySummary = sumSessions(weeklySessions);
  const previousWeeklySummary = sumSessions(previousWeeklySessions);

  const averageDurationSeconds =
    totalWorkouts > 0
      ? Math.round(totalSummary.durationSeconds / totalWorkouts)
      : 0;

  const weeklyProgress = Math.min(
    100,
    Math.round((weeklyTrainedDays / safeWeeklyGoalDays) * 100)
  );

  const previousWeeklyProgress = Math.min(
    100,
    Math.round((previousWeeklyTrainedDays / safeWeeklyGoalDays) * 100)
  );

  const missingWeeklyDays = Math.max(
    0,
    safeWeeklyGoalDays - weeklyTrainedDays
  );

  const weeklyMessage =
    weeklyTrainedDays >= safeWeeklyGoalDays
      ? "Muy bien, cumpliste tu rutina semanal."
      : weeklyTrainedDays === 0
      ? "Todavía no registraste entrenamientos esta semana."
      : `Vas bien. Te faltan ${missingWeeklyDays} entrenamiento${
          missingWeeklyDays === 1 ? "" : "s"
        } para cumplir tu objetivo semanal.`;

  const comparison = {
    workoutsDiff: weeklyTrainedDays - previousWeeklyTrainedDays,
    volumeDiff: weeklySummary.volume - previousWeeklySummary.volume,
    durationDiff:
      weeklySummary.durationSeconds - previousWeeklySummary.durationSeconds,
    exercisesDiff:
      weeklySummary.completedExercises -
      previousWeeklySummary.completedExercises,
    progressDiff: weeklyProgress - previousWeeklyProgress,
  };

  const exerciseProgress = buildExerciseProgress(parsedSessions);

  return {
    parsedSessions,
    weeklySessions,
    previousWeeklySessions,
    weekMap,

    weeklyGoalDays: safeWeeklyGoalDays,
    weeklyTrainedDays,
    previousWeeklyTrainedDays,
    weeklyProgress,
    previousWeeklyProgress,
    missingWeeklyDays,
    weeklyMessage,

    totalWorkouts,
    totalVolume: totalSummary.volume,
    weeklyVolume: weeklySummary.volume,
    previousWeeklyVolume: previousWeeklySummary.volume,

    totalDurationSeconds: totalSummary.durationSeconds,
    weeklyDurationSeconds: weeklySummary.durationSeconds,
    previousWeeklyDurationSeconds: previousWeeklySummary.durationSeconds,

    averageDurationSeconds,
    totalCompletedExercises: totalSummary.completedExercises,
    weeklyCompletedExercises: weeklySummary.completedExercises,
    previousWeeklyCompletedExercises:
      previousWeeklySummary.completedExercises,

    comparison,
    exerciseProgress,
  };
};