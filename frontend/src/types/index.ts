export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name: string | null;
  description: string | null;
  project_type: 'contract' | 'full_time' | 'one_off';
  default_sprint_duration: number;
  color: string;
  active_sprint_name: string | null;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface BacklogItem {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  type: 'story' | 'task' | 'bug';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
  story_points: number | null;
  position: number;
  assignee_id: string | null;
  assignee: User | null;
  labels: string[];
  acceptance_criteria: AcceptanceCriteria[];
  created_at: string;
  updated_at: string;
}

export interface AcceptanceCriteria {
  text: string;
  checked: boolean;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  sprint_number: number;
  duration_weeks: number;
  start_date: string | null;
  end_date: string | null;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string;
  user: User;
  action: 'created' | 'updated' | 'moved' | 'deleted' | 'completed';
  entity_type: 'backlog_item' | 'sprint' | 'project';
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ProjectStats {
  total_items: number;
  new_items: number;
  in_progress: number;
  completed: number;
  total_points: number;
  completed_points: number;
  items_this_week: number;
  items_last_week: number;
}

export interface DashboardStats {
  active_projects: number;
  active_projects_trend: number;
  active_sprints: number;
  active_sprints_trend: number;
  open_items: number;
  open_items_trend: number;
  completed_this_week: number;
  completed_last_week: number;
  completed_trend: number;
}

export interface BurndownData {
  sprint: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    status: string;
  } | null;
  actual: { date: string; remaining_points: number }[];
  ideal: { date: string; remaining_points: number }[];
}

export interface VelocityData {
  sprints: {
    name: string;
    sprint_number: number;
    planned_points: number;
    completed_points: number;
    status: string;
  }[];
  average_velocity: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ReportSummary {
  sprints: {
    name: string;
    sprint_number: number;
    start_date: string | null;
    end_date: string | null;
    duration_days: number;
    planned_points: number;
    completed_points: number;
    completion_rate: number;
    items_total: number;
    items_completed: number;
    items_added_mid_sprint: number;
    velocity: number;
    status: string;
  }[];
  overall: {
    total_sprints_completed: number;
    average_velocity: number;
    average_completion_rate: number;
    total_points_delivered: number;
    total_items_delivered: number;
  };
}

export interface RetroItem {
  id: string;
  sprint_id: string;
  project_id: string;
  column: 'went_well' | 'didnt_go_well' | 'action_item';
  content: string;
  votes: number;
  voted_by: string[];
  resolved: boolean;
  created_by: string;
  creator: User | null;
  created_at: string;
  updated_at: string;
  carried_over: boolean;
  user_has_voted: boolean;
}

export interface RetroResponse {
  went_well: RetroItem[];
  didnt_go_well: RetroItem[];
  action_item: RetroItem[];
  carried_over_actions: RetroItem[];
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    sprint_number: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
    items_completed: number;
    items_total: number;
    points_completed: number;
    points_total: number;
  } | null;
}

export interface SprintCapacity {
  sprint_id: string;
  sprint_name: string;
  total_items: number;
  total_points: number;
  team_velocity: number | null;
  capacity_status: 'under' | 'at' | 'over';
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'removed';
  invited_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  project_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface NotificationCount {
  unread: number;
  total: number;
}

export interface SearchResults {
  query: string;
  results: {
    projects: {
      id: string;
      name: string;
      match: string;
      snippet: string;
    }[];
    backlog_items: {
      id: string;
      title: string;
      project_id: string;
      project_name: string;
      status: string;
      type: string;
      priority: string;
      story_points: number | null;
    }[];
    sprints: {
      id: string;
      name: string;
      project_id: string;
      project_name: string;
      status: string;
    }[];
  };
  total: number;
}

export interface MyTaskItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  story_points: number | null;
  sprint_name: string | null;
  project_id: string;
  project_name: string;
  project_color: string;
  updated_at: string | null;
}

export interface MyTasksResponse {
  items: MyTaskItem[];
  summary: {
    total: number;
    by_status: Record<string, number>;
    total_points: number;
  };
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
}

export interface SprintSummary {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    sprint_number: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
    duration_weeks: number;
  };
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  items_completed: number;
  items_total: number;
  items_added_mid_sprint: number;
  velocity: number;
  duration_days: number;
  has_retro: boolean;
  completed_items: BacklogItem[];
  incomplete_items: BacklogItem[];
}
