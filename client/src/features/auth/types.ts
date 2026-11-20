export interface UserProfile {
  id: string;
  name: string;
  email: string;
  theme: "light" | "dark";
  language: "en" | "es" | "fr" | "de";
  timezone: string;
  focusDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  isEmailVerified: boolean;
  hasGoogleLink: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: true;
  message: string;
  user: UserProfile;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  timezone?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  theme?: "light" | "dark";
  language?: "en" | "es" | "fr" | "de";
  timezone?: string;
  focusDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
}
