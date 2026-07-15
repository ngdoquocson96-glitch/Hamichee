export type Role = "admin" | "manager" | "employee";
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "waiting"
  | "blocked"
  | "pending_review"
  | "completed"
  | "rework";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  department: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string;
  created_by: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  completion_report: string | null;
  blocker_reason: string | null;
  review_note: string | null;
  created_at: string;
  assignee?: Profile;
}
