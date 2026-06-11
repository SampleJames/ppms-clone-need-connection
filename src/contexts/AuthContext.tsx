// import { createContext, useContext, useEffect, useState, ReactNode } from "react";
// import {
//   User,
//   onAuthStateChanged,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signInWithPopup,
//   signOut as fbSignOut,
//   updateProfile,
// } from "firebase/auth";
// import { auth, googleProvider } from "@/lib/firebase";

// interface AuthCtx {
//   user: User | null;
//   loading: boolean;
//   signIn: (email: string, password: string) => Promise<void>;
//   signUp: (email: string, password: string, displayName?: string) => Promise<void>;
//   signInWithGoogle: () => Promise<void>;
//   signOut: () => Promise<void>;
// }

// const Ctx = createContext<AuthCtx | null>(null);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     return onAuthStateChanged(auth, (u) => {
//       setUser(u);
//       setLoading(false);
//     });
//   }, []);

//   const value: AuthCtx = {
//     user,
//     loading,
//     signIn: async (email, password) => {
//       await signInWithEmailAndPassword(auth, email, password);
//     },
//     signUp: async (email, password, displayName) => {
//       const cred = await createUserWithEmailAndPassword(auth, email, password);
//       if (displayName) await updateProfile(cred.user, { displayName });
//     },
//     signInWithGoogle: async () => {
//       await signInWithPopup(auth, googleProvider);
//     },
//     signOut: async () => {
//       await fbSignOut(auth);
//     },
//   };

//   return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
// }

// export function useAuth() {
//   const v = useContext(Ctx);
//   if (!v) throw new Error("useAuth must be used inside AuthProvider");
//   return v;
// }


import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
// ✅ Make sure you import microsoftProvider from your firebase file!
import { auth, googleProvider, microsoftProvider } from "@/lib/firebase";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>; // ✅ Added Microsoft here
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUp: async (email, password, displayName) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(cred.user, { displayName });
    },
    signInWithGoogle: async () => {
      await signInWithPopup(auth, googleProvider);
    },
    // ✅ Added the Microsoft login function here
    signInWithMicrosoft: async () => {
      await signInWithPopup(auth, microsoftProvider);
    },
    signOut: async () => {
      await fbSignOut(auth);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}