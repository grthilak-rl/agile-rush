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
  active_sprints: number;
  open_items: number;
  completed_this_week: number;
  items_last_week: number;
}
