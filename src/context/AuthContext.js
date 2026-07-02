import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebaseConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const getUserProfile = async (firebaseUser) => {
    if (!firebaseUser?.uid) return null;

    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
    };
  };

  const createUserProfile = async ({ firebaseUser, name }) => {
    if (!firebaseUser?.uid) {
      throw new Error("No se encontró el usuario.");
    }

    const userRef = doc(db, "users", firebaseUser.uid);

    const cleanName =
      name?.trim() ||
      firebaseUser.displayName ||
      firebaseUser.email?.split("@")?.[0] ||
      "Usuario Forte";

    const profileData = {
      name: cleanName,
      email: firebaseUser.email || "",
      photoURL: firebaseUser.photoURL || null,
      role: "USER",
      active: true,

      // Preferencias por defecto:
      themeMode: "system",
      colorPreset: "green",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };

    await setDoc(userRef, profileData, { merge: true });

    return {
      id: firebaseUser.uid,
      ...profileData,
    };
  };

  const register = async ({ name, email, password }) => {
    try {
      setAuthLoading(true);

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName) {
        throw new Error("Ingresá tu nombre.");
      }

      if (!cleanEmail) {
        throw new Error("Ingresá tu email.");
      }

      if (!password || password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }

      const credentials = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateProfile(credentials.user, {
        displayName: cleanName,
      });

      const profile = await createUserProfile({
        firebaseUser: credentials.user,
        name: cleanName,
      });

      setUser(credentials.user);
      setUserProfile(profile);

      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        message: getFirebaseErrorMessage(error),
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    try {
      setAuthLoading(true);

      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail) {
        throw new Error("Ingresá tu email.");
      }

      if (!password) {
        throw new Error("Ingresá tu contraseña.");
      }

      const credentials = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      let profile = await getUserProfile(credentials.user);

      if (!profile) {
        profile = await createUserProfile({
          firebaseUser: credentials.user,
          name:
            credentials.user.displayName ||
            credentials.user.email?.split("@")?.[0] ||
            "Usuario Forte",
        });
      } else {
        await setDoc(
          doc(db, "users", credentials.user.uid),
          {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        profile = {
          ...profile,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      setUser(credentials.user);
      setUserProfile(profile);

      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        message: getFirebaseErrorMessage(error),
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);

    setUser(null);
    setUserProfile(null);
  };

  const refreshUserProfile = async () => {
    if (!auth.currentUser) return null;

    let profile = await getUserProfile(auth.currentUser);

    if (!profile) {
      profile = await createUserProfile({
        firebaseUser: auth.currentUser,
        name:
          auth.currentUser.displayName ||
          auth.currentUser.email?.split("@")?.[0] ||
          "Usuario Forte",
      });
    }

    setUserProfile(profile);

    return profile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setUserProfile(null);
          return;
        }

        let profile = await getUserProfile(firebaseUser);

        if (!profile) {
          profile = await createUserProfile({
            firebaseUser,
            name:
              firebaseUser.displayName ||
              firebaseUser.email?.split("@")?.[0] ||
              "Usuario Forte",
          });
        }

        setUser(firebaseUser);
        setUserProfile(profile);
      } catch (error) {
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      userProfile,
      loading,
      authLoading,
      register,
      login,
      logout,
      refreshUserProfile,
      isAuthenticated: !!user,
    }),
    [user, userProfile, loading, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function getFirebaseErrorMessage(error) {
  const code = error?.code;

  if (code === "auth/email-already-in-use") {
    return "Ese email ya está registrado.";
  }

  if (code === "auth/invalid-email") {
    return "El email no tiene un formato válido.";
  }

  if (code === "auth/weak-password") {
    return "La contraseña es demasiado débil. Usá al menos 6 caracteres.";
  }

  if (code === "auth/user-not-found") {
    return "No existe una cuenta con ese email.";
  }

  if (code === "auth/wrong-password") {
    return "La contraseña es incorrecta.";
  }

  if (code === "auth/invalid-credential") {
    return "Email o contraseña incorrectos.";
  }

  if (code === "auth/too-many-requests") {
    return "Demasiados intentos. Probá nuevamente más tarde.";
  }

  return error?.message || "Ocurrió un error. Intentá nuevamente.";
}