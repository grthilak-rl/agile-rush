export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: string;
}

export interface BacklogItem {
  id: string;
  type: 'story' | 'task' | 'bug';
  title: string;
  labels: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  points: number;
  assignee?: TeamMember;
  sprintId?: string;
  status: 'todo' | 'in-progress' | 'in-review' | 'done';
  subtasks?: { total: number; completed: number };
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalPoints: number;
  completedPoints: number;
}

export interface Activity {
  id: string;
  user: TeamMember;
  action: string;
  target: string;
  time: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  color: string;
  activeSprint: Sprint;
  totalSprints: number;
  progress: number;
  team: TeamMember[];
  backlogItems: BacklogItem[];
  activities: Activity[];
  velocityData: { sprint: string; planned: number; completed: number }[];
}

export const teamMembers: TeamMember[] = [
  { id: 'u1', name: 'Sarah Chen', initials: 'SC', color: '#2563EB', role: 'Product Owner' },
  { id: 'u2', name: 'Marcus Johnson', initials: 'MJ', color: '#8B5CF6', role: 'Tech Lead' },
  { id: 'u3', name: 'Emily Rodriguez', initials: 'ER', color: '#F97316', role: 'Frontend Dev' },
  { id: 'u4', name: 'Alex Kim', initials: 'AK', color: '#10B981', role: 'Backend Dev' },
  { id: 'u5', name: 'Priya Patel', initials: 'PP', color: '#F43F5E', role: 'UX Designer' },
  { id: 'u6', name: 'David Wright', initials: 'DW', color: '#EAB308', role: 'QA Engineer' },
  { id: 'u7', name: 'Lisa Chang', initials: 'LC', color: '#06B6D4', role: 'DevOps' },
  { id: 'u8', name: 'Tom Baker', initials: 'TB', color: '#EC4899', role: 'Full Stack Dev' },
];

const project1BacklogItems: BacklogItem[] = [
  {
    id: 'item-1', type: 'story', title: 'User authentication with OAuth 2.0',
    labels: ['auth', 'security'], priority: 'critical', points: 8,
    assignee: teamMembers[1], sprintId: 'sp1', status: 'done',
    subtasks: { total: 5, completed: 5 },
  },
  {
    id: 'item-2', type: 'story', title: 'Dashboard analytics widgets',
    labels: ['dashboard', 'charts'], priority: 'high', points: 5,
    assignee: teamMembers[2], sprintId: 'sp1', status: 'in-review',
    subtasks: { total: 4, completed: 3 },
  },
  {
    id: 'item-3', type: 'task', title: 'Set up CI/CD pipeline with GitHub Actions',
    labels: ['devops', 'automation'], priority: 'high', points: 3,
    assignee: teamMembers[6], sprintId: 'sp1', status: 'in-progress',
  },
  {
    id: 'item-4', type: 'bug', title: 'Fix memory leak in WebSocket connection',
    labels: ['performance', 'critical-fix'], priority: 'critical', points: 3,
    assignee: teamMembers[3], sprintId: 'sp1', status: 'in-progress',
    subtasks: { total: 3, completed: 1 },
  },
  {
    id: 'item-5', type: 'story', title: 'Real-time notification system',
    labels: ['notifications', 'websocket'], priority: 'medium', points: 5,
    assignee: teamMembers[3], sprintId: 'sp1', status: 'todo',
  },
  {
    id: 'item-6', type: 'task', title: 'Write API documentation for v2 endpoints',
    labels: ['documentation'], priority: 'low', points: 2,
    assignee: teamMembers[1], sprintId: 'sp1', status: 'todo',
  },
  {
    id: 'item-7', type: 'story', title: 'Multi-tenant workspace management',
    labels: ['multi-tenant', 'enterprise'], priority: 'high', points: 13,
    assignee: teamMembers[4], sprintId: 'sp1', status: 'todo',
  },
  {
    id: 'item-8', type: 'bug', title: 'Date picker timezone offset issue',
    labels: ['ui', 'dates'], priority: 'medium', points: 2,
    assignee: teamMembers[2], sprintId: 'sp1', status: 'done',
  },
  // Unassigned backlog
  {
    id: 'item-9', type: 'story', title: 'Advanced search with filters and facets',
    labels: ['search', 'ux'], priority: 'medium', points: 8,
  },
  {
    id: 'item-10', type: 'story', title: 'Export reports to PDF and CSV',
    labels: ['reports', 'export'], priority: 'low', points: 5,
  },
  {
    id: 'item-11', type: 'task', title: 'Migrate database to PostgreSQL 16',
    labels: ['database', 'migration'], priority: 'high', points: 8,
  },
  {
    id: 'item-12', type: 'bug', title: 'Safari layout rendering glitch on sidebar',
    labels: ['browser-compat', 'css'], priority: 'low', points: 2,
  },
  {
    id: 'item-13', type: 'story', title: 'Role-based access control (RBAC)',
    labels: ['security', 'permissions'], priority: 'high', points: 13,
  },
  {
    id: 'item-14', type: 'task', title: 'Set up error monitoring with Sentry',
    labels: ['monitoring', 'devops'], priority: 'medium', points: 3,
  },
];

const project1: Project = {
  id: 'proj-1',
  name: 'Phoenix Platform',
  client: 'TechVentures Inc.',
  type: 'Web Application',
  color: '#2563EB',
  activeSprint: {
    id: 'sp1',
    name: 'Sprint 14',
    goal: 'Complete user auth, dashboard widgets, and fix critical bugs',
    startDate: '2026-02-18',
    endDate: '2026-03-04',
    isActive: true,
    totalPoints: 41,
    completedPoints: 28,
  },
  totalSprints: 14,
  progress: 68,
  team: [teamMembers[0], teamMembers[1], teamMembers[2], teamMembers[3], teamMembers[6]],
  backlogItems: project1BacklogItems,
  activities: [
    { id: 'a1', user: teamMembers[1], action: 'moved', target: '"User authentication" to Done', time: '2 hours ago' },
    { id: 'a2', user: teamMembers[2], action: 'commented on', target: '"Dashboard analytics widgets"', time: '3 hours ago' },
    { id: 'a3', user: teamMembers[3], action: 'created', target: '"Fix memory leak in WebSocket connection"', time: '5 hours ago' },
    { id: 'a4', user: teamMembers[0], action: 'updated priority of', target: '"Real-time notifications" to Medium', time: '6 hours ago' },
    { id: 'a5', user: teamMembers[6], action: 'started', target: '"Set up CI/CD pipeline"', time: '1 day ago' },
    { id: 'a6', user: teamMembers[4], action: 'attached designs to', target: '"Multi-tenant workspace management"', time: '1 day ago' },
  ],
  velocityData: [
    { sprint: 'Sprint 9', planned: 34, completed: 28 },
    { sprint: 'Sprint 10', planned: 38, completed: 35 },
    { sprint: 'Sprint 11', planned: 42, completed: 38 },
    { sprint: 'Sprint 12', planned: 36, completed: 36 },
    { sprint: 'Sprint 13', planned: 40, completed: 34 },
    { sprint: 'Sprint 14', planned: 41, completed: 28 },
  ],
};

const project2BacklogItems: BacklogItem[] = [
  {
    id: 'item-20', type: 'story', title: 'Patient appointment scheduling',
    labels: ['scheduling', 'core'], priority: 'critical', points: 8,
    assignee: teamMembers[7], sprintId: 'sp2', status: 'in-progress',
    subtasks: { total: 6, completed: 2 },
  },
  {
    id: 'item-21', type: 'story', title: 'Electronic health records viewer',
    labels: ['ehr', 'hipaa'], priority: 'high', points: 13,
    assignee: teamMembers[4], sprintId: 'sp2', status: 'todo',
  },
  {
    id: 'item-22', type: 'task', title: 'HIPAA compliance audit checklist',
    labels: ['compliance', 'security'], priority: 'critical', points: 5,
    assignee: teamMembers[0], sprintId: 'sp2', status: 'in-review',
  },
  {
    id: 'item-23', type: 'bug', title: 'Prescription dosage calculation rounding error',
    labels: ['critical-fix', 'medical'], priority: 'critical', points: 3,
    assignee: teamMembers[3], sprintId: 'sp2', status: 'done',
  },
];

const project2: Project = {
  id: 'proj-2',
  name: 'MedConnect Portal',
  client: 'HealthFirst Corp',
  type: 'Healthcare Platform',
  color: '#10B981',
  activeSprint: {
    id: 'sp2',
    name: 'Sprint 8',
    goal: 'Launch patient scheduling and pass HIPAA compliance review',
    startDate: '2026-02-20',
    endDate: '2026-03-06',
    isActive: true,
    totalPoints: 29,
    completedPoints: 14,
  },
  totalSprints: 8,
  progress: 48,
  team: [teamMembers[0], teamMembers[3], teamMembers[4], teamMembers[7]],
  backlogItems: project2BacklogItems,
  activities: [
    { id: 'a10', user: teamMembers[3], action: 'fixed', target: '"Prescription dosage rounding error"', time: '1 hour ago' },
    { id: 'a11', user: teamMembers[7], action: 'started', target: '"Patient appointment scheduling"', time: '4 hours ago' },
    { id: 'a12', user: teamMembers[0], action: 'submitted', target: '"HIPAA compliance audit" for review', time: '1 day ago' },
  ],
  velocityData: [
    { sprint: 'Sprint 3', planned: 22, completed: 18 },
    { sprint: 'Sprint 4', planned: 26, completed: 24 },
    { sprint: 'Sprint 5', planned: 28, completed: 22 },
    { sprint: 'Sprint 6', planned: 30, completed: 28 },
    { sprint: 'Sprint 7', planned: 32, completed: 30 },
    { sprint: 'Sprint 8', planned: 29, completed: 14 },
  ],
};

const project3BacklogItems: BacklogItem[] = [
  {
    id: 'item-30', type: 'story', title: 'Live order tracking map view',
    labels: ['maps', 'real-time'], priority: 'high', points: 8,
    assignee: teamMembers[2], sprintId: 'sp3', status: 'in-progress',
  },
  {
    id: 'item-31', type: 'task', title: 'Optimize delivery route algorithm',
    labels: ['algorithm', 'performance'], priority: 'high', points: 13,
    assignee: teamMembers[1], sprintId: 'sp3', status: 'in-progress',
  },
  {
    id: 'item-32', type: 'bug', title: 'Push notification not showing on iOS 18',
    labels: ['mobile', 'ios'], priority: 'medium', points: 3,
    assignee: teamMembers[7], sprintId: 'sp3', status: 'todo',
  },
  {
    id: 'item-33', type: 'story', title: 'Restaurant partner onboarding flow',
    labels: ['onboarding', 'partners'], priority: 'medium', points: 5,
    assignee: teamMembers[4], sprintId: 'sp3', status: 'done',
  },
];

const project3: Project = {
  id: 'proj-3',
  name: 'SwiftDeliver',
  client: 'UrbanEats Co.',
  type: 'Mobile App',
  color: '#F97316',
  activeSprint: {
    id: 'sp3',
    name: 'Sprint 21',
    goal: 'Ship live tracking and optimize delivery routes',
    startDate: '2026-02-23',
    endDate: '2026-03-09',
    isActive: true,
    totalPoints: 29,
    completedPoints: 18,
  },
  totalSprints: 21,
  progress: 62,
  team: [teamMembers[1], teamMembers[2], teamMembers[4], teamMembers[5], teamMembers[7]],
  backlogItems: project3BacklogItems,
  activities: [
    { id: 'a20', user: teamMembers[4], action: 'completed', target: '"Restaurant partner onboarding flow"', time: '3 hours ago' },
    { id: 'a21', user: teamMembers[2], action: 'updated', target: '"Live order tracking" with map integration', time: '5 hours ago' },
  ],
  velocityData: [
    { sprint: 'Sprint 16', planned: 30, completed: 26 },
    { sprint: 'Sprint 17', planned: 32, completed: 30 },
    { sprint: 'Sprint 18', planned: 28, completed: 28 },
    { sprint: 'Sprint 19', planned: 34, completed: 30 },
    { sprint: 'Sprint 20', planned: 36, completed: 32 },
    { sprint: 'Sprint 21', planned: 29, completed: 18 },
  ],
};

export const projects: Project[] = [project1, project2, project3];

export const dashboardStats = {
  activeProjects: 3,
  activeSprints: 3,
  openItems: 24,
  completedThisWeek: 12,
};

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}
