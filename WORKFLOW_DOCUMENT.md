# AgileRush — Application Workflow Document

## Overview

This document defines every user journey, page interaction, and data flow in AgileRush. Use this as the implementation blueprint alongside DESIGN_DOCUMENT.md.

---

## 1. Authentication Flow

### 1.1 Sign Up
```
Landing Page → Click "Get Started" / "Sign Up"
→ Sign Up Page
  - Fields: Full Name, Email, Password, Confirm Password
  - Validation: email format, password min 8 chars, passwords match
  - On submit → POST /api/auth/register
  - Success → Redirect to /dashboard (auto-login)
  - Error → Show inline error message
```

### 1.2 Login
```
Landing Page → Click "Log In"
→ Login Page
  - Fields: Email, Password
  - "Remember me" checkbox
  - "Forgot password?" link (future)
  - On submit → POST /api/auth/login → JWT token stored in httpOnly cookie
  - Success → Redirect to /dashboard
  - Error → Show "Invalid email or password"
```

### 1.3 Logout
```
User avatar dropdown (top-right) → Click "Logout"
→ POST /api/auth/logout → Clear JWT cookie
→ Redirect to /login
```

### 1.4 Protected Routes
```
All /dashboard and /projects/* routes require authentication.
If no valid JWT → Redirect to /login with return URL.
After login → Redirect back to original URL.
```

---

## 2. Dashboard Flow

### 2.1 Dashboard Home (/dashboard)

**On page load:**
- GET /api/projects → Fetch all user's projects
- GET /api/stats/dashboard → Fetch aggregated stats
- Determine greeting based on user's local time (Good morning/afternoon/evening)

**Stat Cards (clickable):**
| Card | Click Action |
|---|---|
| Active Projects | Scroll to project list, filter: active |
| Active Sprints | Navigate to first active project's board |
| Open Items | Navigate to first project's backlog, filter: open |
| Completed This Week | Show completed items modal/panel |

Each stat card shows a **real calculated trend** (e.g., "+3 from last week" or "-2 from last week"), not hardcoded.

**Project Cards:**
- Display: name, client, active sprint name, progress %, team avatars, colored left border
- Click anywhere on card → Navigate to /projects/:id (overview)
- Hover → Lift with shadow

**New Project Button:**
```
Click "New Project"
→ Opens slide-over panel from right
  - Fields: Project Name*, Client Name, Description, Project Type (dropdown), Sprint Duration (1-4 weeks, default 2)
  - On submit → POST /api/projects
  - Success → Close panel, new project appears in grid
  - Error → Show inline validation errors
```

**Empty State (no projects):**
- Show illustration + "Create your first project" CTA button
- Same action as "New Project"

### 2.2 Sidebar (Dashboard Level)
```
MAIN section:
  - Dashboard (active)
  - My Tasks → Shows all tasks assigned to current user across all projects
  - Calendar (future - show "Coming soon" tooltip)
  - Reports (future - show "Coming soon" tooltip)
  
RECENT PROJECTS section:
  - Show last 3 accessed projects with colored dot
  - Click → Navigate to /projects/:id
```

---

## 3. Project Workspace Flow

### 3.1 Entering a Project
```
Dashboard → Click project card → /projects/:id
Sidebar transforms to show project-level navigation:

PROJECT section:
  - Overview (default active)
  - Backlog
  - Board
  - Sprints
  - Reports
  - Settings
```

### 3.2 Back Navigation
```
"← Back to Projects" link in top bar → /dashboard
Also: clicking AgileRush logo → /dashboard
```

---

## 4. Project Overview (/projects/:id)

**On page load:**
- GET /api/projects/:id → Project details
- GET /api/projects/:id/sprints/active → Active sprint data
- GET /api/projects/:id/stats → Sprint stats
- GET /api/projects/:id/activity → Recent activity (last 20 items)

**Active Sprint Banner:**
- Shows: Sprint name, goal, days remaining, completion %, points done/total
- "Go to Board" button → Navigate to /projects/:id/board
- Days remaining text: use singular "DAY" when count is 1

**Sprint Stats Cards (4):**
- Total Items, In Progress, Completed, Story Points
- Each shows real data from active sprint
- Clickable → Navigate to board with that status filtered

**Velocity Chart:**
- Bar chart showing planned vs completed points per sprint
- Hover on bars → Tooltip with exact numbers
- Use recharts library for proper interactivity

**Team Panel:**
- List team members with avatar, name, role, task count, points
- Click member → Filter board/backlog to their assigned items (future)

**Activity Feed:**
- Chronological list of recent actions
- Each entry: avatar, user name, action verb, item title, destination status, timestamp
- Click on item title → Navigate to that item's detail panel

---

## 5. Product Backlog (/projects/:id/backlog)

This is the **Phase 1 MVP priority** — most critical flow.

### 5.1 Page Load
```
GET /api/projects/:id/backlog → All backlog items
GET /api/projects/:id/sprints → Sprint list (for grouping)
```

### 5.2 Backlog Layout
Items displayed in two groups:
1. **Sprint Backlog** — Items assigned to the active sprint (collapsible)
2. **Unassigned Backlog** — Items not in any sprint (collapsible)

Each group header shows: sprint name (or "Backlog"), item count, total story points.

**Item count badges MUST update when filters are applied.**

### 5.3 Search & Filters

**Search bar:**
- Real-time filtering as user types (debounced 300ms)
- Searches: title, description, labels
- Clear button (X) to reset search

**Priority filter pills:** All | Critical | High | Medium | Low
- Single select — clicking one deselects others
- "All" resets the filter

**Type filter pills:** All | 📖 Story | ⚡ Task | 🐛 Bug
- Single select

**Filters are combinable:** e.g., Priority: High + Type: Bug = show only high-priority bugs

### 5.4 Backlog Item Row

Each row displays:
```
[Drag Handle ⠿] [Type Icon] [Title + Labels] [Priority Badge] [Story Points] [Assignee Avatar]
```

**Click on row → Opens Item Detail Panel (slide-over from right)**

### 5.5 Item Detail Panel

This is the **most critical missing feature** from the feedback.

```
Slide-over panel (400px wide) from right side:

Header:
  - Type icon + Type label (editable dropdown)
  - Item title (editable inline — click to edit)
  - Close button (X)
  - Delete button (with confirmation dialog)

Body sections:

STATUS & ASSIGNMENT
  - Status: dropdown (Backlog / To Do / In Progress / In Review / Done)
  - Assignee: dropdown with team member avatars
  - Sprint: dropdown (Unassigned / Sprint 1 / Sprint 2 / ...)
  - Priority: dropdown (Critical / High / Medium / Low)
  - Story Points: number input (fibonacci suggestions: 1, 2, 3, 5, 8, 13)

DETAILS
  - Description: rich text area (markdown support, editable)
  - Acceptance Criteria: checklist (add/remove/check items)

LABELS
  - Show existing labels as pills
  - Add label: text input with autocomplete from existing labels

ACTIVITY / COMMENTS (future phase)
  - Timeline of changes
  - Comment input

Footer:
  - "Created: [date]" / "Updated: [date]"
```

**Auto-save:** Changes save automatically (debounced 500ms) with a small "Saving..." / "Saved ✓" indicator.

### 5.6 Create New Item

```
Click "Add Item" button
→ Opens Item Detail Panel in create mode
  - Title field auto-focused
  - Default values: type=Story, priority=Medium, status=Backlog, points=0
  - On first save (title entered) → POST /api/projects/:id/backlog
  - Item appears in backlog list immediately (optimistic update)
```

**Quick-add shortcut (future):** Press N key → Opens inline row at top of backlog for quick title entry.

### 5.7 Drag & Drop Reordering

```
Drag handle (⠿) on each row enables reordering:
  - Drag within same group → Reorder priority position
  - Drag from "Backlog" to "Sprint" group → Assigns item to active sprint
  - Drag from "Sprint" to "Backlog" group → Removes from sprint
  - On drop → PATCH /api/projects/:id/backlog/reorder (send new positions)
  - Visual feedback: dragged item slightly transparent + elevated shadow
```

### 5.8 Bulk Actions (future)

```
Checkbox on each row → Select multiple items
Bulk action bar appears at bottom:
  - "Move to Sprint" dropdown
  - "Set Priority" dropdown
  - "Assign to" dropdown  
  - "Delete" (with confirmation)
```

---

## 6. Sprint Board (/projects/:id/board)

### 6.1 Page Load
```
GET /api/projects/:id/sprints/active → Active sprint with items
If no active sprint → Show "No active sprint" state with "Start Sprint" CTA
```

### 6.2 Board Layout

**Sprint Header Bar:**
- Sprint name + ACTIVE badge
- Sprint goal (editable inline)
- Days remaining (singular/plural grammar)
- Progress bar with percentage
- Points: completed/total
- "Complete Sprint" button

**Four Columns:**
| Column | Color | Status |
|---|---|---|
| 📋 To Do | #6366F1 (Indigo) | todo |
| 🔨 In Progress | #2563EB (Blue) | in_progress |
| 👀 In Review | #F59E0B (Amber) | in_review |
| ✅ Done | #10B981 (Green) | done |

Each column header: emoji + title + item count badge + "+" quick-add button

### 6.3 Board Cards

Each card displays:
```
[Priority color top border]
[Type icon] [Labels]
[Title]
[Subtask progress bar] (if subtasks exist)
[Assignee avatar] .............. [Story points badge]
```

**Card interactions:**
- **Click card → Opens Item Detail Panel** (same panel as backlog, slide-over from right)
- **Hover → Lift + shadow + slight rotation (0.5deg)**
- **Drag → Move between columns** (changes item status)

### 6.4 Drag & Drop Between Columns

```
Pick up card from "To Do"
→ Card becomes semi-transparent, elevated shadow
→ Hover over "In Progress" column
→ Column highlights with colored border
→ Drop card
→ PATCH /api/projects/:id/backlog/:itemId { status: "in_progress" }
→ Card animates into new column
→ Column counts update
→ Sprint progress recalculates
```

### 6.5 Quick Add on Board

```
Click "+" on column header
→ Inline input appears at top of column
→ Type title + Enter
→ POST /api/projects/:id/backlog { title, status: column_status, sprint_id: active }
→ New card appears in column
→ Press Escape to cancel
```

### 6.6 Complete Sprint

```
Click "Complete Sprint"
→ Confirmation modal:
  "Complete Sprint 3?"
  "3 items are not done. What would you like to do with them?"
  - ○ Move to next sprint
  - ○ Move to backlog
  [Cancel] [Complete Sprint]
→ POST /api/projects/:id/sprints/:sprintId/complete
→ Done items marked as completed
→ Incomplete items moved per selection
→ Redirect to Sprint Planning or Board (if next sprint exists)
```

---

## 7. Sprints Page (/projects/:id/sprints)

### 7.1 Sprint List View
```
Shows all sprints for this project:
  - Active sprint highlighted at top
  - Past sprints listed below (collapsible)
  - "Create Sprint" button

Each sprint card shows:
  - Sprint name, goal, date range
  - Status badge: Planning / Active / Completed
  - Points: completed / planned
  - Item count
  - Completion percentage
```

### 7.2 Create Sprint
```
Click "Create Sprint"
→ Modal:
  - Name: auto-suggested "Sprint [next number]"
  - Goal: text input
  - Duration: dropdown (1/2/3/4 weeks)
  - Start date: date picker
  - End date: auto-calculated from duration
  [Cancel] [Create]
→ POST /api/projects/:id/sprints
→ New sprint appears in list with "Planning" status
```

### 7.3 Sprint Planning View
```
Click on a "Planning" sprint → Expands into planning view:

Left panel: Unassigned backlog items (draggable)
Right panel: Sprint backlog (drop zone)

Sprint capacity indicator:
  - Total points in sprint vs team capacity
  - Visual bar: green (under capacity) / yellow (near) / red (over)

"Start Sprint" button → Changes status to Active
  - Only one sprint can be active at a time
  - If another sprint is active → "Complete current sprint first"
```

### 7.4 Sprint Retrospective
```
After completing a sprint → Prompt: "Run a retrospective?"
→ /projects/:id/sprints/:sprintId/retro

Three-column layout:
  [😊 What Went Well] [😟 What Didn't Go Well] [💡 Action Items]

Each column:
  - "Add card" button at top
  - Click → Inline text input → Enter to save
  - Cards are draggable between columns
  - Each card has a vote button (thumbs up + count)
  - Action items have a checkbox (resolved/unresolved)

Data: POST/GET /api/projects/:id/sprints/:sprintId/retro

Previous retros are viewable from the sprint list (read-only).
```

---

## 8. Reports Page (/projects/:id/reports)

### 8.1 Available Reports

**Sprint Burndown Chart:**
- X-axis: days in sprint
- Y-axis: remaining story points
- Two lines: ideal burndown (straight diagonal) vs actual burndown
- Interactive: hover for daily tooltip

**Velocity Chart:**
- Bar chart: planned vs completed points per sprint
- Shows last 5-10 sprints
- Hover for exact numbers

**Cumulative Flow Diagram (future):**
- Stacked area chart showing items in each status over time

**Sprint Summary Table:**
- Each sprint: name, planned pts, completed pts, % complete, items added mid-sprint, team velocity

### 8.2 Data Source
```
GET /api/projects/:id/reports/burndown?sprint_id=X
GET /api/projects/:id/reports/velocity
GET /api/projects/:id/reports/summary
```

---

## 9. Settings Page (/projects/:id/settings)

### 9.1 Project Settings
```
General:
  - Project name (editable)
  - Client name (editable)
  - Description (editable)
  - Project type dropdown
  - Delete project (danger zone, requires confirmation: type project name)

Sprint Settings:
  - Default sprint duration (1-4 weeks)
  - Auto-create next sprint on completion (toggle)
  
Board Settings:
  - Column names (customizable — rename columns)
  - Add/remove columns (future)
  
Notifications (future):
  - Sprint starting/ending reminders
  - Item assigned to you
  - Daily digest
```

---

## 10. User Profile & Account

### 10.1 User Avatar Dropdown (top-right)
```
Click avatar → Dropdown menu:
  - "Sarah Chen" (name)
  - "sarah@example.com" (email)
  - ──────────
  - Profile Settings
  - ──────────
  - Logout
```

### 10.2 Profile Settings (/settings/profile)
```
  - Full name (editable)
  - Email (editable, requires verification)
  - Avatar (upload image or auto-generate from initials)
  - Change password
```

---

## 11. Global Features

### 11.1 Notifications (future)
```
Bell icon in top bar → Dropdown:
  - "Alice moved 'Auth JWT' to In Progress" — 2h ago
  - "Sprint 3 ends in 2 days" — 5h ago
  - "Bob assigned you 'CI/CD Pipeline'" — 1d ago
  - "See all notifications"
```

### 11.2 Global Search (future)
```
Search icon / Cmd+K in top bar → Search modal:
  - Searches across: projects, backlog items, team members
  - Results grouped by type
  - Click result → Navigate to item
```

### 11.3 Keyboard Shortcuts (future)
```
? → Show shortcuts panel
N → New item (context-aware: new project on dashboard, new backlog item in project)
B → Go to board
L → Go to backlog
/ → Focus search
Esc → Close panel/modal
```

---

## 12. API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/logout | Invalidate session |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/projects | List user's projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project details |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/projects/:id/stats | Dashboard stats |
| GET | /api/projects/:id/activity | Recent activity feed |

### Backlog
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/projects/:id/backlog | List all backlog items |
| POST | /api/projects/:id/backlog | Create backlog item |
| GET | /api/projects/:id/backlog/:itemId | Get item details |
| PATCH | /api/projects/:id/backlog/:itemId | Update item |
| DELETE | /api/projects/:id/backlog/:itemId | Delete item |
| PATCH | /api/projects/:id/backlog/reorder | Reorder items |

### Sprints
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/projects/:id/sprints | List all sprints |
| POST | /api/projects/:id/sprints | Create sprint |
| GET | /api/projects/:id/sprints/active | Get active sprint |
| PATCH | /api/projects/:id/sprints/:sprintId | Update sprint |
| POST | /api/projects/:id/sprints/:sprintId/start | Start sprint |
| POST | /api/projects/:id/sprints/:sprintId/complete | Complete sprint |

### Retrospectives
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/projects/:id/sprints/:sprintId/retro | Get retro items |
| POST | /api/projects/:id/sprints/:sprintId/retro | Add retro item |
| PATCH | /api/projects/:id/sprints/:sprintId/retro/:retroId | Update retro item |
| POST | /api/projects/:id/sprints/:sprintId/retro/:retroId/vote | Vote on item |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/projects/:id/reports/burndown | Burndown data |
| GET | /api/projects/:id/reports/velocity | Velocity data |
| GET | /api/projects/:id/reports/summary | Sprint summaries |

### User
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/users/me | Get profile |
| PATCH | /api/users/me | Update profile |

---

## 13. Data Models (Database Schema)

### User
```
id: UUID (PK)
email: string (unique)
full_name: string
hashed_password: string
avatar_url: string (nullable)
created_at: timestamp
updated_at: timestamp
```

### Project
```
id: UUID (PK)
name: string
client_name: string (nullable)
description: text (nullable)
project_type: enum (contract, full_time, one_off)
default_sprint_duration: integer (weeks, default 2)
owner_id: UUID (FK → User)
color: string (hex, auto-assigned)
created_at: timestamp
updated_at: timestamp
```

### BacklogItem
```
id: UUID (PK)
project_id: UUID (FK → Project)
sprint_id: UUID (FK → Sprint, nullable)
title: string
description: text (nullable)
type: enum (story, task, bug)
priority: enum (critical, high, medium, low)
status: enum (backlog, todo, in_progress, in_review, done)
story_points: integer (nullable)
position: integer (for ordering)
assignee_id: UUID (FK → User, nullable)
labels: string[] (array)
acceptance_criteria: jsonb (array of {text, checked})
created_at: timestamp
updated_at: timestamp
```

### Sprint
```
id: UUID (PK)
project_id: UUID (FK → Project)
name: string
goal: text (nullable)
sprint_number: integer
duration_weeks: integer
start_date: date (nullable)
end_date: date (nullable)
status: enum (planning, active, completed)
created_at: timestamp
updated_at: timestamp
```

### RetroItem
```
id: UUID (PK)
sprint_id: UUID (FK → Sprint)
project_id: UUID (FK → Project)
column: enum (went_well, didnt_go_well, action_item)
content: text
votes: integer (default 0)
resolved: boolean (default false)
created_at: timestamp
```

### DailySnapshot (for burndown)
```
id: UUID (PK)
sprint_id: UUID (FK → Sprint)
date: date
total_points: integer
completed_points: integer
remaining_points: integer
items_count: integer
created_at: timestamp
```

### ActivityLog
```
id: UUID (PK)
project_id: UUID (FK → Project)
user_id: UUID (FK → User)
action: enum (created, updated, moved, deleted, completed, commented)
entity_type: enum (backlog_item, sprint, project, retro_item)
entity_id: UUID
details: jsonb (e.g., {from_status: "todo", to_status: "in_progress"})
created_at: timestamp
```

---

## 14. Implementation Priority Order

### Phase 1 — Foundation + Backlog (Weeks 1-2)
0. Landing Page
- Read LANDING_PAGE_SPEC.md
- Build the landing page at route /
- Use Sora font for headings, Inter for body
- All CSS animations (no JS animation library)
- Email capture → routes to /register?email=
- Navbar: transparent → white on scroll
- Fully responsive (mobile hamburger menu)
- This is the public entry point — no auth required

1. Auth system (register, login, logout, JWT, protected routes)
2. Project CRUD (create, list, update, delete)
3. Backlog CRUD (create, list, update, delete items)
4. Item Detail Panel (slide-over with all fields)
5. Backlog filters and search
6. Drag-and-drop reordering in backlog

### Phase 2 — Sprint Board (Week 3)
7. Sprint CRUD (create, start, complete)
8. Sprint Board with drag-and-drop between columns
9. Board card → detail panel
10. Quick-add on board columns
11. Sprint header with live stats

### Phase 3 — Sprint Management (Week 4)
12. Sprint list page
13. Sprint planning view (drag from backlog to sprint)
14. Sprint completion flow (handle incomplete items)
15. Sprint retrospective (three columns, voting)

### Phase 4 — Reports & Polish (Week 5)
16. Burndown chart (recharts)
17. Velocity chart
18. Sprint summary table
19. Project settings page
20. Activity log feed
21. Dashboard stat calculations with real trends

### Phase 5 — Quality & UX (Week 6)
22. Empty states for all pages
23. Loading skeletons
24. Error handling and toast notifications
25. Mobile responsive polish
26. User profile dropdown and settings
27. Performance optimization