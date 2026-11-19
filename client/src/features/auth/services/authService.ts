import { signInWithPopup, signOut } from "firebase/auth";
import {
  apiClient,
  clearAllAuthTokens,
  setInMemoryToken,
  setStoredJwtToken,
} from "../../../lib/api";
import { firebaseAuth, googleAuthProvider } from "../../../lib/firebase";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from "../types";

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      "/users/register",
      payload,
    );
    setInMemoryToken(null);
    setStoredJwtToken(response.data.token);
    return response.data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      "/users/login",
      payload,
    );
    setInMemoryToken(null);
    setStoredJwtToken(response.data.token);
    return response.data;
  },

  async loginWithGoogle(): Promise<UserProfile> {
    if (!firebaseAuth || !googleAuthProvider) {
      throw new Error("Google sign-in is not configured in this environment.");
    }
    const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();
    setStoredJwtToken(null);
    setInMemoryToken(idToken);
    return this.getMe();
  },

  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<{ success: true; data: UserProfile }>(
      "/users/me",
    );
    return response.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    const response = await apiClient.patch<{
      success: true;
      data: UserProfile;
    }>("/users/me", payload);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/users/logout");
    } catch {
      // Ignore if session already expired
    }
    if (firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch {
        // Ignore if not signed in with Firebase
      }
    }
    clearAllAuthTokens();
  },
};
