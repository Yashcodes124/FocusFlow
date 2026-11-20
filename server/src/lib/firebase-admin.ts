import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

interface FirebaseAppletConfig {
  projectId?: string;
}

function resolveFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID?.trim()) {
    return process.env.FIREBASE_PROJECT_ID.trim();
  }

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(process.cwd(), "firebase-applet-config.json"),
    path.resolve(process.cwd(), "..", "firebase-applet-config.json"),
    path.resolve(currentDir, "../../../firebase-applet-config.json"),
    path.resolve(currentDir, "../../../../firebase-applet-config.json"),
  ];

  for (const configPath of candidatePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw) as FirebaseAppletConfig;
        if (parsed.projectId?.trim()) {
          return parsed.projectId.trim();
        }
      } catch {
        // Ignore malformed optional config and continue checking fallbacks
      }
    }
  }

  return null;
}

let resolvedAdminAuth: Auth | null = null;
const projectId = resolveFirebaseProjectId();

if (projectId) {
  if (!getApps().length) {
    initializeApp({ projectId });
  }
  resolvedAdminAuth = getAuth();
}

export const adminAuth: Auth | null = resolvedAdminAuth;
export const isFirebaseAuthConfigured = Boolean(resolvedAdminAuth);
