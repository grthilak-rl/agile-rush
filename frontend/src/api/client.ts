import axios from 'axios';
import type {
  User,
  Project,
  BacklogItem,
  Sprint,
  ActivityLog,
  ProjectStats,
} from '../types';

// In dev, Vite proxy forwards /api → http://localhost:8000
// In prod, set VITE_API_URL to the full backend URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = `/login?returnUrl=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post<TokenResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects/'),
  create: (data: {
    name: string;
    client_name?: string;
    description?: string;
    project_type?: string;
    default_sprint_duration?: number;
  }) => api.post<Project>('/projects/', data),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  update: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  stats: (id: string) => api.get<ProjectStats>(`/projects/${id}/stats`),
};

// Backlog
export const backlogApi = {
  list: (projectId: string, params?: Record<string, string>) =>
    api.get<BacklogItem[]>(`/projects/${projectId}/backlog`, { params }),
  create: (projectId: string, data: Partial<BacklogItem>) =>
    api.post<BacklogItem>(`/projects/${projectId}/backlog`, data),
  get: (projectId: string, itemId: string) =>
    api.get<BacklogItem>(`/projects/${projectId}/backlog/${itemId}`),
  update: (projectId: string, itemId: string, data: Partial<BacklogItem>) =>
    api.patch<BacklogItem>(`/projects/${projectId}/backlog/${itemId}`, data),
  delete: (projectId: string, itemId: string) =>
    api.delete(`/projects/${projectId}/backlog/${itemId}`),
  reorder: (
    projectId: string,
    items: { id: string; position: number; sprint_id?: string | null }[]
  ) => api.patch(`/projects/${projectId}/backlog/reorder`, { items }),
};

// Sprints
export const sprintsApi = {
  list: (projectId: string) =>
    api.get<Sprint[]>(`/projects/${projectId}/sprints`),
  active: (projectId: string) =>
    api.get<Sprint | null>(`/projects/${projectId}/sprints/active`),
  create: (projectId: string, data?: { name?: string; goal?: string; duration_weeks?: number }) =>
    api.post<Sprint>(`/projects/${projectId}/sprints`, data || {}),
  get: (projectId: string, sprintId: string) =>
    api.get<Sprint>(`/projects/${projectId}/sprints/${sprintId}`),
  update: (projectId: string, sprintId: string, data: Partial<Sprint>) =>
    api.patch<Sprint>(`/projects/${projectId}/sprints/${sprintId}`, data),
  start: (projectId: string, sprintId: string) =>
    api.post<Sprint>(`/projects/${projectId}/sprints/${sprintId}/start`),
  complete: (projectId: string, sprintId: string, data: { action: string }) =>
    api.post<Sprint>(`/projects/${projectId}/sprints/${sprintId}/complete`, data),
};

// Activity
export const activityApi = {
  list: (projectId: string, params?: { limit?: number; offset?: number }) =>
    api.get<ActivityLog[]>(`/projects/${projectId}/activity`, { params }),
};

export default api;
