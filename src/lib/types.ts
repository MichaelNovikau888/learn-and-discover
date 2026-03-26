export type AppRole = 'student' | 'teacher' | 'manager' | 'admin';
export type LessonType = 'individual' | 'group';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  individual_lessons: number;
  group_lessons: number;
  max_participants: number;
  lessons_count: number;
  price: number;
  discount_price: number | null;
  contract_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  bio: string | null;
  specialization: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Schedule {
  id: string;
  teacher_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_id: string;
  lesson_type: LessonType;
  max_participants: number;
  is_active: boolean;
  created_at: string;
  teacher?: Teacher;
  course?: Course;
}

export interface StudentCourse {
  id: string;
  student_id: string;
  course_id: string;
  lessons_remaining: number;
  lessons_total: number;
  individual_lessons_remaining: number;
  group_lessons_remaining: number;
  paid_online: boolean;
  stripe_payment_id: string | null;
  is_repeat_purchase: boolean;
  created_at: string;
  expires_at: string | null;
  course?: Course;
}

export interface Booking {
  id: string;
  student_id: string;
  schedule_id: string;
  student_course_id: string | null;
  booking_date: string;
  status: BookingStatus;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  schedule?: Schedule;
  student_course?: StudentCourse;
}

export interface TrialRequest {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  wants_whatsapp: boolean;
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteContent {
  id: string;
  section_key: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  content: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DAY_NAMES = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

export const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
