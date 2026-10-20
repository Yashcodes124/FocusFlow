import axios from "axios";

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterUserData = AuthCredentials & {
  name: string;
};

export type AuthResponse = {
  success: true;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/+$/, "");

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

export const authService = {
  async register(userData: RegisterUserData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/users/register", userData);
    localStorage.setItem("token", response.data.token);
    return response.data;
  },

  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/users/login", credentials);
    localStorage.setItem("token", response.data.token);
    return response.data;
  },

  logout() {
    localStorage.removeItem("token");
  },

  getCurrentToken() {
    return localStorage.getItem("token");
  },
};
