# AgileRush

Agile project management platform built for consultants and small teams. Manage sprints, track backlogs, run retrospectives, and collaborate with your team — all in one place.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, React Router 6 |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 16 |
| Auth | JWT (Bearer tokens) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| Icons | Lucide React |
| Deployment | Docker, Docker Compose, nginx |

## Features

- **Authentication** - Register, login, JWT-based session management
- **Project Management** - Create and manage multiple projects with types (contract, full-time, one-off)
- **Product Backlog** - Full CRUD with drag-and-drop reordering, filters, search, and item detail panels
- **Sprint Board** - Kanban board with drag-and-drop between columns (To Do, In Progress, In Review, Done)
- **Sprint Planning** - Create sprints, drag items from backlog, capacity tracking with team velocity
- **Sprint Retrospectives** - Three-column retro board (Went Well, Didn't Go Well, Action Items) with voting
- **Reports & Analytics** - Burndown charts, velocity charts, sprint summary tables
- **Team Collaboration** - Invite members, role-based access control (Owner, Admin, Member, Viewer)
- **Notifications** - In-app notifications for assignments, sprint events, invitations
- **Global Search** - Search across projects, backlog items, and sprints (Cmd+K)
- **Keyboard Shortcuts** - Navigate quickly with keyboard shortcuts
- **My Tasks** - Cross-project view of all assigned items
- **API Keys** - Generate API keys for external integrations
- **External API** - RESTful API (v1) for integrating with other platforms

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

```bash
# Clone the repository
git clone <repo-url> agile-rush
cd agile-rush

# Start all services (PostgreSQL + Backend + Frontend)
docker compose up -d

# Seed the database with sample data
docker compose exec backend python -m app.seed

# Open the app
open http://localhost:5173
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

### Demo Accounts

After seeding, you can log in with:

| Email | Password | Role |
|-------|----------|------|
| raj@agilerush.com | password123 | Project Owner |
| alice@agilerush.com | password123 | Admin / Member |
| bob@agilerush.com | password123 | Member |

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `JWT_SECRET_KEY` | (required) | Secret key for JWT signing |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_HOURS` | `24` | Token expiration in hours |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Backend API base URL (proxied in dev) |

## Project Structure

```
agile-rush/
├── backend/
│   ├── app/
│   │   ├── api/           # API route handlers
│   │   ├── core/          # Auth, config, utilities
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── database.py    # Database setup
│   │   ├── main.py        # FastAPI application
│   │   └── seed.py        # Sample data seeder
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # API client (Axios)
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth)
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript interfaces
│   │   └── App.tsx        # Router setup
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── nginx.conf
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production
└── README.md
```

## API Documentation

When the backend is running, interactive API docs are available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| Auth | `POST /api/auth/register` | Create account |
| Auth | `POST /api/auth/login` | Login (returns JWT) |
| Projects | `GET /api/projects/` | List user's projects |
| Backlog | `GET /api/projects/:id/backlog` | List backlog items |
| Sprints | `GET /api/projects/:id/sprints/active` | Get active sprint |
| Board | `PATCH /api/projects/:id/backlog/:itemId` | Update item (move on board) |
| Reports | `GET /api/projects/:id/reports/burndown` | Burndown chart data |
| Members | `POST /api/projects/:id/members/invite` | Invite team member |
| Search | `GET /api/search?q=keyword` | Global search |
| Tasks | `GET /api/tasks/me` | My assigned tasks |

### External API (API Key Auth)

External endpoints use `X-API-Key` header authentication:

```bash
curl -H "X-API-Key: ar_live_..." http://localhost:8000/api/v1/projects
```

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/projects` | List projects |
| `GET /api/v1/projects/:id/status` | Project status summary |
| `GET /api/v1/projects/:id/backlog` | Read backlog items |
| `POST /api/v1/projects/:id/backlog` | Create backlog item |

## Production Deployment

```bash
# Create .env.production with required variables
cp .env.example .env.production
# Edit .env.production with real values

# Build and start production containers
docker compose -f docker-compose.prod.yml up -d --build
```

The production setup uses:
- Multi-stage Docker builds for optimized images
- nginx for serving the frontend SPA and proxying API requests
- Non-root user in backend container
- PostgreSQL with persistent volume

## Role Permissions

| Permission | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| View project | Yes | Yes | Yes | Yes |
| Create/edit backlog items | Yes | Yes | Yes | No |
| Move cards on board | Yes | Yes | Yes | No |
| Create/manage sprints | Yes | Yes | No | No |
| Add retro items and vote | Yes | Yes | Yes | Yes |
| Project settings | Yes | Yes | No | No |
| Invite/remove members | Yes | Yes | No | No |
| Delete project | Yes | No | No | No |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `N` | New item |
| `B` | Go to board |
| `L` | Go to backlog |
| `S` | Go to sprints |
| `D` | Go to dashboard |
| `T` | Go to my tasks |
| `?` | Show shortcuts help |
| `Esc` | Close panel/modal |

## License

Private - All rights reserved.
