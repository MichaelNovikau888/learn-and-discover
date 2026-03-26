/**
 * api.types.ts — типы ответов Spring Boot бэкенда.
 *
 * Зеркалят Java DTO: ProfileResponse, DashboardResponse, BookingResponse и т.д.
 * Фронтовые типы из types.ts (snake_case, Supabase-стиль) живут отдельно —
 * не смешиваем, чтобы не было путаницы при миграции.
 *
 * Соглашение об именовании:
 *   Api* — типы ответов бэкенда (camelCase, как в Java)
 *   Запросы именуем по смыслу: LoginRequest, RegisterRequest, BookingRequest и т.д.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/** Ответ POST /api/auth/login и /api/auth/register */
export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Роли в uppercase: "STUDENT", "TEACHER", "MANAGER", "ADMIN" */
  roles: string[];
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ApiProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: string[];
  active: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phone?: string;
}

// ── Courses ───────────────────────────────────────────────────────────────────

export interface ApiCourse {
  id: string;
  name: string;
  description: string | null;
  individualLessons: number;
  groupLessons: number;
  price: number;
  discountPrice: number | null;
  active: boolean;
  createdAt: string;
}

export interface ApiStudentCourse {
  id: string;
  courseId: string;
  courseName: string;
  individualLessonsRemaining: number;
  groupLessonsRemaining: number;
  repeatPurchase: boolean;
  paidOnline: boolean;
  expiresAt: string | null;
  /** true если осталось ≤10% инд. занятий — бэкенд считает сам */
  individualLowBalance: boolean;
  /** true если осталось ≤10% груп. занятий */
  groupLowBalance: boolean;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface BookingRequest {
  scheduleId: string;
  bookingDate: string; // "yyyy-MM-dd"
}

export interface ApiBooking {
  id: string;
  scheduleId: string;
  bookingDate: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  lessonType: 'INDIVIDUAL' | 'GROUP';
  teacherName: string;
  courseName: string;
  startTime: string; // "HH:mm:ss"
  endTime: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface ApiDashboard {
  activeCourses: ApiStudentCourse[];
  upcomingBookings: ApiBooking[];
  stats: {
    totalIndividualRemaining: number;
    totalGroupRemaining: number;
    completedLessons: number;
    hasLowBalance: boolean;
  };
}

// ── Teachers ──────────────────────────────────────────────────────────────────

export interface ApiTeacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  specialization: string | null;
  avatarUrl: string | null;
  active: boolean;
}

// ── Schedules ─────────────────────────────────────────────────────────────────

export interface ApiSchedule {
  id: string;
  teacherId: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lessonType: 'INDIVIDUAL' | 'GROUP';
  maxParticipants: number;
  active: boolean;
  teacher?: ApiTeacher;
  course?: ApiCourse;
}

// ── Trial Requests ────────────────────────────────────────────────────────────

export interface TrialRequestPayload {
  firstName: string;
  lastName?: string;
  phone: string;
  wantsWhatsapp: boolean;
}

export interface ApiTrialRequest {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  wantsWhatsapp: boolean;
  status: 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
}

// ── Site Content ──────────────────────────────────────────────────────────────

export interface ApiSiteContent {
  id: string;
  sectionKey: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  content: Record<string, unknown>;
  active: boolean;
}

// ── Users (admin/manager) ─────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  roles: string[];
  active: boolean;
  createdAt: string;
}
