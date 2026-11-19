import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { TasksPage } from "./pages/TasksPage";
import { HabitsPage } from "./pages/HabitsPage";
import { FocusPage } from "./pages/FocusPage";
import { NotesPage } from "./pages/NotesPage";
import { SettingsPage } from "./pages/SettingsPage";

function ProtectedWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedWorkspace>
                <DashboardPage />
              </ProtectedWorkspace>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedWorkspace>
                <TasksPage />
              </ProtectedWorkspace>
            }
          />
          <Route
            path="/habits"
            element={
              <ProtectedWorkspace>
                <HabitsPage />
              </ProtectedWorkspace>
            }
          />
          <Route
            path="/focus"
            element={
              <ProtectedWorkspace>
                <FocusPage />
              </ProtectedWorkspace>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedWorkspace>
                <NotesPage />
              </ProtectedWorkspace>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedWorkspace>
                <SettingsPage />
              </ProtectedWorkspace>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
