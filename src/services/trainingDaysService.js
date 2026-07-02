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
const getTrainingDaysCollection = (uid) => {
  return collection(db, "users", uid, "trainingDays");
};

export const getTrainingDays = async (uid) => {
  if (!uid) {
    throw new Error("No se encontró el usuario.");
  }

  const daysRef = getTrainingDaysCollection(uid);

  const q = query(daysRef, orderBy("order", "asc"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
};

export const createTrainingDay = async ({ uid, name, order }) => {
  if (!uid) {
    throw new Error("No se encontró el usuario.");
  }

  if (!name?.trim()) {
    throw new Error("Ingresá el nombre del día.");
  }

  const daysRef = getTrainingDaysCollection(uid);

  const docRef = await addDoc(daysRef, {
    name: name.trim(),
    order: order || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateTrainingDay = async ({ uid, dayId, name }) => {
  if (!uid) {
    throw new Error("No se encontró el usuario.");
  }

  if (!dayId) {
    throw new Error("No se encontró el día.");
  }

  if (!name?.trim()) {
    throw new Error("Ingresá el nombre del día.");
  }

  const dayRef = doc(db, "users", uid, "trainingDays", dayId);

  await updateDoc(dayRef, {
    name: name.trim(),
    updatedAt: serverTimestamp(),
  });
};

export const deleteTrainingDay = async ({ uid, dayId }) => {
  if (!uid) {
    throw new Error("No se encontró el usuario.");
  }

  if (!dayId) {
    throw new Error("No se encontró el día.");
  }

  const dayRef = doc(db, "users", uid, "trainingDays", dayId);

  await deleteDoc(dayRef);
};