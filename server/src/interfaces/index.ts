/**
 * Server-side User Interfaces
 */

/**
 * User Database Model Interface
 */
export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  theme: "light" | "dark";
  timezone: string;
  language: "en" | "es" | "fr" | "de";
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  notificationSettings: {
    emailNotifications: boolean;
    taskReminders: boolean;
    habitReminders: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Service Response
 */
export interface IUserResponse {
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
 * Auth Token Payload
 */
export interface ITokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Task Database Model Interface
 * Professional task management with all features from Todoist, TickTick, Microsoft To Do
 */
export interface ITask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: "Todo" | "In Progress" | "Completed";
  priority: "Low" | "Medium" | "High";
  categoryId?: string;
  dueDate?: Date | null;
  reminderTime?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number;
  color?: string;
  isImportant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task with populated relationships
 */
export interface ITaskWithRelations extends ITask {
  category?: ICategory;
  tags?: ITag[];
}

/**
 * Habit Database Model Interface
 * Repeated actions with streak tracking
 */
export interface IHabit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  target: number;
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
 * Category Database Model Interface
 */
export interface ICategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tag Database Model Interface
 */
export interface ITag {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Notification Database Model Interface
 */
export interface INotification {
  id: string;
  userId: string;
  taskId?: string;
  habitId?: string;
  title: string;
  message: string;
  time: Date;
  isRead: boolean;
  type: "Task" | "Habit" | "Reminder" | "System";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Response Wrapper
 */
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

/**
 * Paginated Response
 */
export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  statusCode: number;
}

/**
 * Error Response
 */
export interface IErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  details?: Record<string, any>;
}
