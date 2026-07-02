// Firebase:
import { initializeApp } from "firebase/app";
import {
    getAuth,
    initializeAuth,
    getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configuración Firebase:
const firebaseConfig = {
    apiKey: "AIzaSyAb5Ol-gHKLlLCVuae-2ntKwOLH_qQpTKY",
    authDomain: "forte-gym-3b1b4.firebaseapp.com",
    projectId: "forte-gym-3b1b4",
    storageBucket: "forte-gym-3b1b4.firebasestorage.app",
    messagingSenderId: "842763217105",
    appId: "1:842763217105:web:3642eddc4c17092721fdf0",
};

const app = initializeApp(firebaseConfig);

let auth;

try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
    } catch (error) {
    auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);
export { app, auth, db, storage };