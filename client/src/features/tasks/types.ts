/**
 * User Interface
 * Represents a user in the FocusFlow application
 */

export type Theme = "light" | "dark";
export type Language = "en" | "es" | "fr" | "de";
export type NotificationSettings = {
  emailNotifications: boolean;
  taskReminders: boolean;
  habitReminders: boolean;
};

/**
 * User Auth Response (for login/register endpoints)
 */
export interface UserAuthResponse {
  user: UserProfile;
  token: string;
  refreshToken?: string;
}

/**
 * Login Request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register Request
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Update User Profile Request
 */
export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  theme?: Theme;
  timezone?: string;
  language?: Language;
  notificationSettings?: {
    emailNotifications?: boolean;
    taskReminders?: boolean;
    habitReminders?: boolean;
  };
}

/**
 * Change Password Request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Refresh Token Request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Forgot Password Request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset Password Request
 */
export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Note: Password should only be in auth context, not sent to frontend
  avatar?: string;
  theme: Theme;
  language: Language;
  isEmailVerified: boolean;
  notificationSettings: NotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Profile for display/update (excludes sensitive data)
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  theme: "light" | "dark";
  timezone: string;
  language: "en" | "es" | "fr" | "de";
  isEmailVerified: boolean;
  notificationSettings: {
    emailNotifications: boolean;
    taskReminders: boolean;
    habitReminders: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task Interface - Represents a task in FocusFlow
 * Think: Todoist, TickTick, Microsoft To Do
 */

export type Priority = "Low" | "Medium" | "High";
export type Status = "TO_DO" | "IN_PROGRESS" | "COMPLETED";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  categoryId?: string;
  category?: Category;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number;
  color?: string;
  isImportant: boolean;
  tags?: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task Create/Update Request
 */
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: Priority;
  dueDate?: Date;
  reminderTime?: Date | null;
  categoryId?: string;
}

/**
 * Task Update Request
 */
export type UpdateTaskRequest = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "priority"
    | "status"
    | "dueDate"
    | "color"
    | "category"
  >
>;

/**
 * Habit Interface - Represents a repeating habit
 * Tasks end. Habits repeat.
 */

export type Frequency = "Daily" | "Weekly" | "Monthly";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: Frequency;
  target: number; // e.g., 30 days, 52 weeks
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  lastCompleted?: Date | null;
  color?: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Habit Create Request
 */
export interface CreateHabitRequest {
  name: string;
  description?: string;
  frequency: Frequency;
  target: number;
  color?: string;
  icon?: string;
}

/**
 * Habit Update Request
 */
export type UpdateHabitRequest = Partial<Habit>;
/**
 * Category Interface - Store category names to avoid duplication
 */
export interface Category {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Create/Update Request
 */
export type CreateCategoryRequest = Pick<Category, "name" | "color">;

/**
 * Tag Interface - Multiple tags can be assigned to tasks
 */
export interface Tag {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Tag Create Request
 */
export type CreateTagRequest = Pick<Tag, "name">;

/**
 * Notification Interface - Send reminders and updates to users
 */

export type NotificationType = "TASK" | "HABIT" | "REMINDER" | "SYSTEM";

export interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  habitId?: string;
  title: string;
  message: string;
  time: Date;
  isRead: boolean;
  notificationType: NotificationType;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Create Request
 */

export type CreateNotificationRequest = Pick<
  Notification,
  "title" | "notificationType" | "message" | "time" | "taskId" | "habitId"
>;
