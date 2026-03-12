import axios from 'axios';
import type {
  User,
  Project,
  BacklogItem,
  Sprint,
  ActivityLog,
  ProjectStats,
  DashboardStats,
  RetroItem,
  RetroResponse,
  SprintCapacity,
  SprintSummary,
  BurndownData,
  VelocityData,
  ReportSummary,
  ProjectMember,
  Notification,
  NotificationCount,
  SearchResults,
  MyTasksResponse,
  ApiKeyItem,
  Attachment,
  Comment,
  MemberSearchResult,
  NotificationPreferences,
} from '../types';

// In dev, Vite proxy forwards /api -> http://localhost:8000
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
export interface DiscoverProject {
  id: string;
  name: string;
  description: string | null;
  owner: { id: string; full_name: string } | null;
  pending_request?: boolean;
}

export const projectsApi = {
  list: () => api.get<Project[]>('/projects/'),
  discover: (q?: string) => api.get<DiscoverProject[]>('/projects/discover', { params: { q } }),
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
  updateSettings: (id: string, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}/settings`, data),
  delete: (id: string, confirmName?: string) =>
    api.delete(`/projects/${id}`, { data: confirmName ? { confirm_name: confirmName } : undefined }),
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
  upcoming: (projectId: string) =>
    api.get<BacklogItem[]>(`/projects/${projectId}/backlog/upcoming`),
  bulkUpdate: (projectId: string, data: { item_ids: string[]; changes: Record<string, unknown> }) =>
    api.post<{ updated: number }>(`/projects/${projectId}/backlog/bulk-update`, data),
  bulkDelete: (projectId: string, data: { item_ids: string[] }) =>
    api.delete<{ deleted: number }>(`/projects/${projectId}/backlog/bulk-delete`, { data }),
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
  delete: (projectId: string, sprintId: string) =>
    api.delete(`/projects/${projectId}/sprints/${sprintId}`),
  items: (projectId: string, sprintId: string) =>
    api.get<BacklogItem[]>(`/projects/${projectId}/sprints/${sprintId}/items`),
  capacity: (projectId: string, sprintId: string) =>
    api.get<SprintCapacity>(`/projects/${projectId}/sprints/${sprintId}/capacity`),
  summary: (projectId: string, sprintId: string) =>
    api.get<SprintSummary>(`/projects/${projectId}/sprints/${sprintId}/summary`),
  unassigned: (projectId: string) =>
    api.get<BacklogItem[]>(`/projects/${projectId}/backlog/unassigned`),
  bulkMove: (projectId: string, data: { item_ids: string[]; sprint_id: string | null }) =>
    api.patch(`/projects/${projectId}/backlog/bulk-move`, data),
};

// Retro
export const retroApi = {
  get: (projectId: string, sprintId: string) =>
    api.get<RetroResponse>(`/projects/${projectId}/sprints/${sprintId}/retro`),
  create: (projectId: string, sprintId: string, data: { content: string; column: string }) =>
    api.post<RetroItem>(`/projects/${projectId}/sprints/${sprintId}/retro`, data),
  update: (projectId: string, sprintId: string, retroId: string, data: Partial<RetroItem>) =>
    api.patch<RetroItem>(`/projects/${projectId}/sprints/${sprintId}/retro/${retroId}`, data),
  delete: (projectId: string, sprintId: string, retroId: string) =>
    api.delete(`/projects/${projectId}/sprints/${sprintId}/retro/${retroId}`),
  vote: (projectId: string, sprintId: string, retroId: string) =>
    api.post<RetroItem>(`/projects/${projectId}/sprints/${sprintId}/retro/${retroId}/vote`),
};

// Activity
export const activityApi = {
  list: (projectId: string, params?: { limit?: number; offset?: number }) =>
    api.get<ActivityLog[]>(`/projects/${projectId}/activity`, { params }),
};

// Reports
export const reportsApi = {
  burndown: (projectId: string, sprintId?: string) =>
    api.get<BurndownData>(`/projects/${projectId}/reports/burndown`, {
      params: sprintId ? { sprint_id: sprintId } : undefined,
    }),
  velocity: (projectId: string) =>
    api.get<VelocityData>(`/projects/${projectId}/reports/velocity`),
  summary: (projectId: string) =>
    api.get<ReportSummary>(`/projects/${projectId}/reports/summary`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/stats/dashboard'),
};

// Users
export const usersApi = {
  updateProfile: (data: { full_name?: string; email?: string; avatar_url?: string }) =>
    api.patch<User>('/users/me', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.patch('/users/me/password', data),
  getNotificationPreferences: () =>
    api.get<NotificationPreferences>('/users/me/notification-preferences'),
  updateNotificationPreferences: (data: Partial<NotificationPreferences>) =>
    api.patch<NotificationPreferences>('/users/me/notification-preferences', data),
};

// Members
export const membersApi = {
  list: (projectId: string) =>
    api.get<ProjectMember[]>(`/projects/${projectId}/members`),
  search: (projectId: string, q: string) =>
    api.get<MemberSearchResult[]>(`/projects/${projectId}/members/search`, { params: { q } }),
  searchUsersToAdd: (projectId: string, q: string) =>
    api.get<MemberSearchResult[]>(`/projects/${projectId}/members/search-users`, { params: { q } }),
  addMember: (projectId: string, data: { user_id: string; role?: string }) =>
    api.post(`/projects/${projectId}/members/add`, data),
  invite: (projectId: string, data: { email: string; role?: string }) =>
    api.post(`/projects/${projectId}/members/invite`, data),
  accept: (projectId: string) =>
    api.post(`/projects/${projectId}/members/accept`),
  requestJoin: (projectId: string) =>
    api.post(`/projects/${projectId}/members/request-join`),
  withdrawRequest: (projectId: string) =>
    api.post(`/projects/${projectId}/members/withdraw-request`),
  joinRequests: (projectId: string) =>
    api.get<ProjectMember[]>(`/projects/${projectId}/members/join-requests`),
  approveRequest: (projectId: string, memberId: string) =>
    api.post(`/projects/${projectId}/members/${memberId}/approve`),
  denyRequest: (projectId: string, memberId: string) =>
    api.post(`/projects/${projectId}/members/${memberId}/deny`),
  updateRole: (projectId: string, memberId: string, data: { role: string }) =>
    api.patch(`/projects/${projectId}/members/${memberId}`, data),
  remove: (projectId: string, memberId: string) =>
    api.delete(`/projects/${projectId}/members/${memberId}`),
  transferOwnership: (projectId: string, data: { new_owner_id: string }) =>
    api.post(`/projects/${projectId}/members/transfer-ownership`, data),
};

// Notifications
export const notificationsApi = {
  list: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
    api.get<Notification[]>('/notifications', { params }),
  count: () => api.get<NotificationCount>('/notifications/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Search
export const searchApi = {
  search: (q: string, projectId?: string) =>
    api.get<SearchResults>('/search', { params: { q, project_id: projectId } }),
};

// Tasks
export const tasksApi = {
  myTasks: (params?: { status?: string; project_id?: string; sort?: string }) =>
    api.get<MyTasksResponse>('/tasks/me', { params }),
};

// API Keys
export const apiKeysApi = {
  list: () => api.get<ApiKeyItem[]>('/settings/api-keys'),
  create: (data: { name: string }) => api.post<ApiKeyItem>('/settings/api-keys', data),
  revoke: (id: string) => api.delete(`/settings/api-keys/${id}`),
};

// Attachments
export const attachmentsApi = {
  list: (projectId: string, itemId: string) =>
    api.get<Attachment[]>(`/projects/${projectId}/backlog/${itemId}/attachments`),
  upload: (projectId: string, itemId: string, formData: FormData, onUploadProgress?: (e: { loaded: number; total?: number }) => void) =>
    api.post<Attachment>(`/projects/${projectId}/backlog/${itemId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  delete: (projectId: string, itemId: string, attachmentId: string) =>
    api.delete(`/projects/${projectId}/backlog/${itemId}/attachments/${attachmentId}`),
};

// Comments
export const commentsApi = {
  list: (projectId: string, itemId: string, params?: { limit?: number; offset?: number }) =>
    api.get<Comment[]>(`/projects/${projectId}/backlog/${itemId}/comments`, { params }),
  create: (projectId: string, itemId: string, data: { content: string }) =>
    api.post<Comment>(`/projects/${projectId}/backlog/${itemId}/comments`, data),
  update: (projectId: string, itemId: string, commentId: string, data: { content: string }) =>
    api.patch<Comment>(`/projects/${projectId}/backlog/${itemId}/comments/${commentId}`, data),
  delete: (projectId: string, itemId: string, commentId: string) =>
    api.delete(`/projects/${projectId}/backlog/${itemId}/comments/${commentId}`),
};

// Import / Export
export const importExportApi = {
  preview: (projectId: string, file: File, source: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    return api.post<ImportPreviewResponse>(`/projects/${projectId}/import/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  executeImport: (projectId: string, file: File, source: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    return api.post<ImportResultResponse>(`/projects/${projectId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadTemplate: (projectId: string) =>
    api.get(`/projects/${projectId}/import/template`, { responseType: 'blob' }),
  exportCsv: (projectId: string, params?: { sprint_id?: string; status?: string }) =>
    api.get(`/projects/${projectId}/export/csv`, { params, responseType: 'blob' }),
  exportJson: (projectId: string, params?: { sprint_id?: string; include_comments?: boolean }) =>
    api.get(`/projects/${projectId}/export/json`, { params, responseType: 'blob' }),
  exportPdf: (projectId: string, sprintId: string) =>
    api.get(`/projects/${projectId}/export/pdf`, { params: { sprint_id: sprintId }, responseType: 'blob' }),
};

export interface ImportPreviewResponse {
  source: string;
  total_items: number;
  items_preview: {
    title: string;
    type: string;
    status: string;
    priority: string;
    story_points: number | null;
    labels: string[];
    due_date: string | null;
  }[];
  status_mapping: Record<string, string>;
  unmapped_statuses: string[];
  warnings: string[];
}

export interface ImportResultResponse {
  success: boolean;
  items_created: number;
  labels_found: string[];
  errors: string[];
  warnings: string[];
}

// Calendar
export const calendarApi = {
  get: (projectId: string, start: string, end: string) =>
    api.get<CalendarResponse>(`/projects/${projectId}/calendar`, { params: { start, end } }),
};

export interface CalendarItemData {
  id: string;
  title: string;
  due_date: string | null;
  start_date: string | null;
  type: 'story' | 'task' | 'bug';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  story_points: number | null;
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  sprint: { id: string; name: string } | null;
  labels: string[];
  is_overdue: boolean;
}

export interface CalendarSprintData {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export interface CalendarResponse {
  items: CalendarItemData[];
  sprints: CalendarSprintData[];
}

// Admin
export interface AdminStats {
  total_users: number;
  total_projects: number;
  new_users_this_week: number;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_disabled: boolean;
  created_at: string | null;
  project_count: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdminProject {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  project_type: string | null;
  owner_name: string | null;
  owner_email: string | null;
  member_count: number;
  item_count: number;
  created_at: string | null;
}

export interface AdminProjectsResponse {
  projects: AdminProject[];
  total: number;
  page: number;
  per_page: number;
}

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats'),
  listUsers: (params?: { page?: number; per_page?: number; q?: string }) =>
    api.get<AdminUsersResponse>('/admin/users', { params }),
  disableUser: (userId: string) => api.patch(`/admin/users/${userId}/disable`),
  enableUser: (userId: string) => api.patch(`/admin/users/${userId}/enable`),
  resetPassword: (userId: string) =>
    api.post<{ message: string; temporary_password: string }>(`/admin/users/${userId}/reset-password`),
  toggleAdmin: (userId: string) =>
    api.patch<{ message: string; is_admin: boolean }>(`/admin/users/${userId}/toggle-admin`),
  listProjects: (params?: { page?: number; per_page?: number; q?: string }) =>
    api.get<AdminProjectsResponse>('/admin/projects', { params }),
  deleteProject: (projectId: string) => api.delete(`/admin/projects/${projectId}`),
};

export default api;
