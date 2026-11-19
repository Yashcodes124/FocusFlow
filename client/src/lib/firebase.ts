import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const optionalConfigModules = import.meta.glob<FirebaseOptions>(
  "../../../firebase-applet-config.json",
  { eager: true, import: "default" },
);

function resolveFirebaseConfig(): FirebaseOptions | null {
  const fileConfig = Object.values(optionalConfigModules)[0];
  if (fileConfig?.apiKey && fileConfig?.projectId) {
    return fileConfig;
  }

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
    };
  }

  return null;
}

const config = resolveFirebaseConfig();

let resolvedAuth: Auth | null = null;
let resolvedGoogleProvider: GoogleAuthProvider | null = null;

if (config) {
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  resolvedAuth = getAuth(app);
  resolvedGoogleProvider = new GoogleAuthProvider();
  resolvedGoogleProvider.setCustomParameters({ prompt: "select_account" });
}

export const firebaseAuth = resolvedAuth;
export const googleAuthProvider = resolvedGoogleProvider;
export const isFirebaseEnabled = Boolean(resolvedAuth && resolvedGoogleProvider);
