/**
 * apiClient.ts — типизированный HTTP-клиент для Spring Boot бэкенда.
 *
 * Что делает:
 *  - Хранит JWT в localStorage (ключ "fasol_token")
 *  - Подставляет Authorization: Bearer <token> в каждый запрос автоматически
 *  - При 401 — чистит токен и редиректит на /auth (без цикла)
 *  - Бросает ApiError с { status, message } для обработки в хуках и компонентах
 *  - Все методы типизированы дженериками — IDE подсказывает ответ
 *
 * Использование:
 *   import { api } from '@/lib/apiClient';
 *   const courses = await api.get<CourseResponse[]>('/courses');
 *   const booking = await api.post<BookingResponse>('/bookings', { scheduleId, bookingDate });
 */

// ── Конфигурация ─────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const TOKEN_KEY = 'fasol_token';

// ── Типы ─────────────────────────────────────────────────────────────────────

/** Ответ Spring ProblemDetail (RFC 7807) — то что бросает GlobalExceptionHandler */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
}

/** Кастомная ошибка — содержит HTTP-статус и человекочитаемое сообщение */
export class ApiError extends Error {
  constructor(
      public readonly status: number,
      message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Токен ────────────────────────────────────────────────────────────────────

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

// ── Ядро запроса ─────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
): Promise<T> {
  const token = tokenStorage.get();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 204 No Content — просто возвращаем undefined
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  // 401 — токен протух или невалиден
  if (response.status === 401) {
    tokenStorage.clear();
    // Редирект только если мы не уже на странице /auth
    if (!window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth';
    }
    throw new ApiError(401, 'Сессия истекла. Войдите снова.');
  }

  // Парсим тело — Spring всегда отдаёт JSON
  let data: unknown;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
    data = await response.json();
  }

  if (!response.ok) {
    // GlobalExceptionHandler возвращает ProblemDetail
    const problem = data as ProblemDetail | undefined;
    const message = problem?.detail ?? `Ошибка ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}

// ── Публичный API ─────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
      request<T>('GET', path, undefined, signal),

  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      request<T>('POST', path, body, signal),

  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      request<T>('PUT', path, body, signal),

  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
      request<T>('PATCH', path, body, signal),

  delete: <T = void>(path: string, signal?: AbortSignal) =>
      request<T>('DELETE', path, undefined, signal),
};
