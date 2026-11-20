import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Flame, ListChecks, Timer } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  loginFormSchema,
  registerFormSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from "../features/auth/validation";
import { extractApiErrorMessage } from "../lib/api";
import { isFirebaseEnabled } from "../lib/firebase";
import { getBrowserTimezone } from "../utils/dates";
import { Button } from "../components/ui/Button";
import { InputField } from "../components/ui/FormFields";
import { ErrorBanner } from "../components/ui/States";

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-slate-50 dark:bg-slate-950 lg:grid-cols-12">
      <div className="hidden flex-col justify-between border-r border-slate-200 bg-white p-12 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 lg:flex">
        <div>
          <span
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            FocusFlow
          </span>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Decide what matters today, then finish it without noise.
            </h1>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              FocusFlow connects your task backlog, daily habits, notes, and
              timed deep-work sessions into one structured workspace.
            </p>
          </div>

          <ul className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <li className="flex items-start gap-3">
              <ListChecks
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Prioritized daily execution
                </p>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Organize tasks by due date, priority, categories, and tags.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Timer
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Protected focus sessions
                </p>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Link Pomodoro blocks directly to tasks and track real minutes.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Flame
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Honest habit streaks
                </p>
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Daily check-ins with timezone-accurate streak history.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Calm daily planning · Keyboard accessible
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:col-span-7">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <span
              className="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              FocusFlow
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(
        extractApiErrorMessage(error, "Invalid email or password."),
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setServerError(
        extractApiErrorMessage(error, "Google sign-in was cancelled or failed."),
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Sign in to FocusFlow"
      subtitle="Enter your credentials to continue where you left off."
    >
      <div className="space-y-5">
        {serverError && <ErrorBanner message={serverError} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InputField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <InputField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full"
          >
            Sign in
          </Button>
        </form>

        {isFirebaseEnabled && (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              loading={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full"
            >
              Continue with Google
            </Button>
          </>
        )}

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          New to FocusFlow?{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register: registerUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        timezone: getBrowserTimezone(),
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(
        extractApiErrorMessage(error, "Unable to create your account."),
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setServerError(
        extractApiErrorMessage(error, "Google sign-in was cancelled or failed."),
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your personal workspace in under a minute."
    >
      <div className="space-y-5">
        {serverError && <ErrorBanner message={serverError} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InputField
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="Alex Rivera"
            error={errors.name?.message}
            {...register("name")}
          />

          <InputField
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <InputField
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            helperText="Use 8 or more characters."
            error={errors.password?.message}
            {...register("password")}
          />

          <InputField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Create account
          </Button>
        </form>

        {isFirebaseEnabled && (
          <>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  or continue with
                </span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              loading={googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full"
            >
              Continue with Google
            </Button>
          </>
        )}

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
