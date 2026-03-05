"""
Seed script for AgileRush database.
Run with: python -m app.seed
"""

from datetime import datetime, timedelta, timezone, date
from uuid import uuid4

from app.database import Base, engine, SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.project import Project, ProjectType
from app.models.sprint import Sprint, SprintStatus
from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus
from app.models.activity_log import ActivityLog, ActionType, EntityType
from app.models.retro_item import RetroItem, RetroColumn
from app.models.daily_snapshot import DailySnapshot


def seed():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ---- User ----
        print("Creating user...")
        user = User(
            id=str(uuid4()),
            email="raj@agilerush.com",
            full_name="Rajthilak",
            hashed_password=hash_password("password123"),
        )
        db.add(user)
        db.flush()

        # ---- Projects ----
        print("Creating projects...")
        project1 = Project(
            id=str(uuid4()),
            name="Phoenix Platform",
            client_name="TechVentures Inc.",
            description="A next-generation SaaS platform for enterprise resource management with real-time analytics and AI-powered insights.",
            project_type=ProjectType.contract,
            default_sprint_duration=2,
            owner_id=user.id,
            color="#2563EB",
        )
        project2 = Project(
            id=str(uuid4()),
            name="MedConnect Portal",
            client_name="HealthFirst Corp",
            description="Patient management portal with telemedicine capabilities, appointment scheduling, and electronic health records integration.",
            project_type=ProjectType.full_time,
            default_sprint_duration=2,
            owner_id=user.id,
            color="#10B981",
        )
        db.add_all([project1, project2])
        db.flush()

        # ---- Sprints ----
        print("Creating sprints...")
        now = datetime.now(timezone.utc)
        today = date.today()

        # Project 1 sprints
        s12_start = today - timedelta(days=42)
        s12_end = s12_start + timedelta(days=14)
        sprint_p1_12 = Sprint(
            id=str(uuid4()), project_id=project1.id, name="Sprint 12",
            goal="Set up CI/CD pipeline and monitoring infrastructure",
            sprint_number=12, duration_weeks=2, start_date=s12_start, end_date=s12_end,
            status=SprintStatus.completed,
        )

        s13_start = s12_end
        s13_end = s13_start + timedelta(days=14)
        sprint_p1_13 = Sprint(
            id=str(uuid4()), project_id=project1.id, name="Sprint 13",
            goal="Implement user roles and permissions system",
            sprint_number=13, duration_weeks=2, start_date=s13_start, end_date=s13_end,
            status=SprintStatus.completed,
        )

        s14_start = today - timedelta(days=5)
        s14_end = s14_start + timedelta(days=14)
        sprint1 = Sprint(
            id=str(uuid4()), project_id=project1.id, name="Sprint 14",
            goal="Complete OAuth 2.0 integration and dashboard analytics MVP",
            sprint_number=14, duration_weeks=2, start_date=s14_start, end_date=s14_end,
            status=SprintStatus.active,
        )

        sprint_p1_15 = Sprint(
            id=str(uuid4()), project_id=project1.id, name="Sprint 15",
            goal="Multi-tenant architecture and data export features",
            sprint_number=15, duration_weeks=2, status=SprintStatus.planning,
        )

        # Project 2 sprints
        s7_start = today - timedelta(days=28)
        s7_end = s7_start + timedelta(days=14)
        sprint_p2_7 = Sprint(
            id=str(uuid4()), project_id=project2.id, name="Sprint 7",
            goal="Build initial patient registration flow",
            sprint_number=7, duration_weeks=2, start_date=s7_start, end_date=s7_end,
            status=SprintStatus.completed,
        )

        sprint2 = Sprint(
            id=str(uuid4()), project_id=project2.id, name="Sprint 8",
            goal="Implement patient intake forms and appointment scheduling",
            sprint_number=8, duration_weeks=2, status=SprintStatus.planning,
        )

        db.add_all([sprint_p1_12, sprint_p1_13, sprint1, sprint_p1_15, sprint_p2_7, sprint2])
        db.flush()

        # ---- Backlog Items ----
        print("Creating backlog items...")

        # Sprint 12 items (21 pts, all done)
        items_s12 = [
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_12.id,
                title="Set up GitHub Actions CI pipeline", type=ItemType.task, priority=Priority.high,
                status=ItemStatus.done, story_points=5, position=1, assignee_id=user.id,
                labels=["devops", "ci-cd"],
                acceptance_criteria=[{"text": "Lint and test on every PR", "checked": True}, {"text": "Auto-deploy to staging on merge", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_12.id,
                title="Configure Datadog monitoring", type=ItemType.task, priority=Priority.medium,
                status=ItemStatus.done, story_points=3, position=2, assignee_id=user.id,
                labels=["monitoring"],
                acceptance_criteria=[{"text": "APM traces for all API endpoints", "checked": True}, {"text": "Error rate alerts configured", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_12.id,
                title="Docker containerization", type=ItemType.task, priority=Priority.high,
                status=ItemStatus.done, story_points=5, position=3, assignee_id=user.id,
                labels=["devops", "docker"],
                acceptance_criteria=[{"text": "Multi-stage Dockerfile for API", "checked": True}, {"text": "Docker Compose for local dev", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_12.id,
                title="Set up staging environment", type=ItemType.task, priority=Priority.high,
                status=ItemStatus.done, story_points=8, position=4, assignee_id=user.id,
                labels=["devops", "infrastructure"],
                acceptance_criteria=[{"text": "Staging mirrors production config", "checked": True}, {"text": "Automated DB migrations on deploy", "checked": True}]),
        ]
        db.add_all(items_s12)
        db.flush()

        # Sprint 13 items (26 pts, all done)
        items_s13 = [
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="Role-based access control system", type=ItemType.story, priority=Priority.critical,
                status=ItemStatus.done, story_points=8, position=1, assignee_id=user.id,
                labels=["auth", "security"],
                acceptance_criteria=[{"text": "Admin, Editor, Viewer roles defined", "checked": True}, {"text": "Permission checks on all endpoints", "checked": True}, {"text": "Role assignment UI for admins", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="User invitation flow", type=ItemType.story, priority=Priority.high,
                status=ItemStatus.done, story_points=5, position=2, assignee_id=user.id,
                labels=["auth", "email"],
                acceptance_criteria=[{"text": "Invite users via email", "checked": True}, {"text": "Accept invite sets up account", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="Audit log for admin actions", type=ItemType.story, priority=Priority.medium,
                status=ItemStatus.done, story_points=5, position=3, assignee_id=user.id,
                labels=["security", "compliance"],
                acceptance_criteria=[{"text": "All admin actions logged", "checked": True}, {"text": "Searchable audit log UI", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="Fix session timeout not redirecting", type=ItemType.bug, priority=Priority.high,
                status=ItemStatus.done, story_points=2, position=4, assignee_id=user.id,
                labels=["auth", "bug-fix"],
                acceptance_criteria=[{"text": "Expired sessions redirect to login", "checked": True}, {"text": "Return URL preserved after re-login", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="API documentation generation", type=ItemType.task, priority=Priority.low,
                status=ItemStatus.done, story_points=3, position=5, assignee_id=user.id,
                labels=["docs", "api"],
                acceptance_criteria=[{"text": "OpenAPI spec auto-generated", "checked": True}, {"text": "Swagger UI accessible at /docs", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint_p1_13.id,
                title="SSO integration research spike", type=ItemType.task, priority=Priority.medium,
                status=ItemStatus.done, story_points=3, position=6, assignee_id=user.id,
                labels=["auth", "research"],
                acceptance_criteria=[{"text": "Evaluate SAML vs OIDC options", "checked": True}, {"text": "Document recommended approach", "checked": True}]),
        ]
        db.add_all(items_s13)
        db.flush()

        # Sprint 14 items (32 pts, 6 done)
        items_p1 = [
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint1.id,
                title="User authentication with OAuth 2.0",
                description="Implement OAuth 2.0 authentication flow supporting Google, GitHub, and Microsoft providers.",
                type=ItemType.story, priority=Priority.critical, status=ItemStatus.in_progress,
                story_points=8, position=1, assignee_id=user.id, labels=["auth", "security"],
                acceptance_criteria=[{"text": "Users can sign in with Google OAuth", "checked": True}, {"text": "Users can sign in with GitHub OAuth", "checked": True}, {"text": "Token refresh works automatically", "checked": False}, {"text": "Session persists across browser restarts", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint1.id,
                title="Dashboard analytics widgets",
                description="Build interactive analytics widgets for the main dashboard.",
                type=ItemType.story, priority=Priority.high, status=ItemStatus.todo,
                story_points=13, position=2, assignee_id=user.id, labels=["dashboard", "charts"],
                acceptance_criteria=[{"text": "Revenue chart displays last 30 days data", "checked": False}, {"text": "User growth chart shows weekly trends", "checked": False}, {"text": "Widgets are responsive on all screen sizes", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint1.id,
                title="Fix memory leak in WebSocket connection",
                description="Investigate and fix the memory leak in long-running WebSocket connections.",
                type=ItemType.bug, priority=Priority.critical, status=ItemStatus.in_review,
                story_points=5, position=3, assignee_id=user.id, labels=["performance", "critical-fix"],
                acceptance_criteria=[{"text": "No memory growth after 48 hours", "checked": True}, {"text": "WebSocket reconnection handles gracefully", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint1.id,
                title="API rate limiting middleware",
                description="Implement rate limiting for all API endpoints.",
                type=ItemType.task, priority=Priority.medium, status=ItemStatus.done,
                story_points=3, position=4, assignee_id=user.id, labels=["api", "security"],
                acceptance_criteria=[{"text": "Free tier limited to 100 requests/minute", "checked": True}, {"text": "Pro tier limited to 1000 requests/minute", "checked": True}, {"text": "Rate limit headers included in responses", "checked": True}],
                updated_at=now - timedelta(days=2)),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=None,
                title="Multi-tenant data isolation",
                description="Implement row-level security and tenant isolation.",
                type=ItemType.story, priority=Priority.high, status=ItemStatus.backlog,
                story_points=13, position=5, assignee_id=None, labels=["architecture", "security"],
                acceptance_criteria=[{"text": "Tenant data is completely isolated", "checked": False}, {"text": "Cross-tenant queries are impossible", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=None,
                title="Export data to CSV and PDF",
                description="Allow users to export their data to CSV and PDF formats.",
                type=ItemType.story, priority=Priority.low, status=ItemStatus.backlog,
                story_points=5, position=6, assignee_id=None, labels=["export", "reports"],
                acceptance_criteria=[{"text": "CSV export includes all visible columns", "checked": False}, {"text": "PDF export uses branded template", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=sprint1.id,
                title="Refactor database query optimization",
                description="Optimize slow database queries identified in APM.",
                type=ItemType.task, priority=Priority.medium, status=ItemStatus.done,
                story_points=3, position=7, assignee_id=user.id, labels=["performance", "database"],
                acceptance_criteria=[{"text": "All N+1 queries eliminated", "checked": True}, {"text": "Average query time reduced by 50%", "checked": True}, {"text": "Missing indexes added", "checked": True}],
                updated_at=now - timedelta(hours=12)),
            BacklogItem(id=str(uuid4()), project_id=project1.id, sprint_id=None,
                title="Notification system with email and push",
                description="Build a comprehensive notification system.",
                type=ItemType.story, priority=Priority.medium, status=ItemStatus.backlog,
                story_points=8, position=8, assignee_id=None, labels=["notifications", "email"],
                acceptance_criteria=[{"text": "Users receive in-app notifications", "checked": False}, {"text": "Email notifications for critical events", "checked": False}]),
        ]
        db.add_all(items_p1)
        db.flush()

        # Project 2 - Sprint 7 items (15 pts, all done)
        items_s7 = [
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint_p2_7.id,
                title="Patient registration form", type=ItemType.story, priority=Priority.critical,
                status=ItemStatus.done, story_points=8, position=1, assignee_id=user.id,
                labels=["forms", "patient"],
                acceptance_criteria=[{"text": "All required fields validated", "checked": True}, {"text": "HIPAA-compliant data handling", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint_p2_7.id,
                title="Insurance verification lookup", type=ItemType.story, priority=Priority.high,
                status=ItemStatus.done, story_points=5, position=2, assignee_id=user.id,
                labels=["insurance", "integration"],
                acceptance_criteria=[{"text": "Verify coverage in real-time", "checked": True}, {"text": "Display copay and deductible info", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint_p2_7.id,
                title="Fix double-submission on registration", type=ItemType.bug, priority=Priority.high,
                status=ItemStatus.done, story_points=2, position=3, assignee_id=user.id,
                labels=["bug-fix", "forms"],
                acceptance_criteria=[{"text": "Submit button disabled after first click", "checked": True}, {"text": "No duplicate records created", "checked": True}]),
        ]
        db.add_all(items_s7)
        db.flush()

        # Project 2 - Sprint 8 & backlog items
        items_p2 = [
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint2.id,
                title="Patient intake form builder",
                description="Create a drag-and-drop form builder for custom patient intake forms.",
                type=ItemType.story, priority=Priority.critical, status=ItemStatus.todo,
                story_points=13, position=1, assignee_id=user.id, labels=["forms", "hipaa"],
                acceptance_criteria=[{"text": "Forms support text, checkbox, dropdown, and signature fields", "checked": False}, {"text": "Form data is encrypted at rest", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint2.id,
                title="Appointment scheduling with calendar sync",
                description="Implement appointment booking system with calendar integration.",
                type=ItemType.story, priority=Priority.high, status=ItemStatus.in_progress,
                story_points=8, position=2, assignee_id=user.id, labels=["scheduling", "calendar"],
                acceptance_criteria=[{"text": "Patients can book from available time slots", "checked": True}, {"text": "Providers see appointments synced", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint2.id,
                title="Fix prescription dosage validation bug",
                description="Fix the dosage validation allowing values exceeding safe limits.",
                type=ItemType.bug, priority=Priority.critical, status=ItemStatus.done,
                story_points=2, position=3, assignee_id=user.id, labels=["prescription", "critical-fix"],
                acceptance_criteria=[{"text": "Dosage validation checks against medication database", "checked": True}, {"text": "Warning displayed for doses near maximum", "checked": True}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=None,
                title="Telemedicine video consultation",
                description="Integrate WebRTC-based video consultation feature.",
                type=ItemType.story, priority=Priority.high, status=ItemStatus.backlog,
                story_points=13, position=4, assignee_id=None, labels=["telemedicine", "video"],
                acceptance_criteria=[{"text": "Stable video call between patient and provider", "checked": False}, {"text": "Screen sharing capability", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=None,
                title="EHR integration with HL7 FHIR",
                description="Build HL7 FHIR-compliant integration layer.",
                type=ItemType.task, priority=Priority.medium, status=ItemStatus.backlog,
                story_points=8, position=5, assignee_id=None, labels=["ehr", "fhir", "integration"],
                acceptance_criteria=[{"text": "Patient demographics sync with external EHR", "checked": False}, {"text": "Lab results imported automatically", "checked": False}]),
            BacklogItem(id=str(uuid4()), project_id=project2.id, sprint_id=sprint2.id,
                title="Patient portal accessibility audit",
                description="Conduct and fix WCAG 2.1 AA compliance issues.",
                type=ItemType.task, priority=Priority.medium, status=ItemStatus.todo,
                story_points=5, position=6, assignee_id=user.id, labels=["accessibility", "compliance"],
                acceptance_criteria=[{"text": "All pages pass WCAG 2.1 AA automated checks", "checked": True}, {"text": "Screen reader navigation tested", "checked": False}]),
        ]
        db.add_all(items_p2)
        db.flush()

        # ---- Daily Snapshots ----
        print("Creating daily snapshots...")

        def create_snapshots(sprint_id, start, end, total_pts, burndown_curve, items_count):
            for day_offset in range(min(len(burndown_curve), (end - start).days + 1)):
                snap_date = start + timedelta(days=day_offset)
                if snap_date > today:
                    break
                remaining = burndown_curve[day_offset]
                db.add(DailySnapshot(
                    id=str(uuid4()), sprint_id=sprint_id, date=snap_date,
                    total_points=total_pts, completed_points=total_pts - remaining,
                    remaining_points=remaining, items_count=items_count,
                ))

        # Sprint 12: 21 pts, all done
        create_snapshots(sprint_p1_12.id, s12_start, s12_end, 21,
            [21, 21, 21, 16, 16, 13, 13, 13, 8, 8, 5, 5, 0, 0, 0], 4)

        # Sprint 13: 26 pts, all done
        create_snapshots(sprint_p1_13.id, s13_start, s13_end, 26,
            [26, 26, 26, 26, 18, 18, 18, 13, 13, 8, 8, 5, 3, 0, 0], 6)

        # Sprint 14: 32 pts, 6 done so far (active)
        create_snapshots(sprint1.id, s14_start, s14_end, 32,
            [32, 32, 29, 29, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26], 5)

        # Sprint 7 (Project 2): 15 pts, all done
        create_snapshots(sprint_p2_7.id, s7_start, s7_end, 15,
            [15, 15, 15, 13, 13, 8, 8, 5, 5, 3, 3, 0, 0, 0, 0], 3)

        db.flush()

        # ---- Retro Items ----
        print("Creating retro items...")
        retro_items_s13 = [
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.went_well, content="RBAC implementation was well-planned and had clear acceptance criteria from the start",
                votes=5, voted_by=[user.id], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.went_well, content="Pair programming sessions helped catch edge cases in the permission system early",
                votes=3, voted_by=[user.id], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.went_well, content="CI/CD pipeline from Sprint 12 saved hours of manual deployment work",
                votes=4, voted_by=[user.id], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.went_well, content="Code reviews were thorough and caught a potential security vulnerability",
                votes=2, voted_by=[], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.didnt_go_well, content="Scope creep on the invitation flow - added email templates not in the original spec",
                votes=3, voted_by=[user.id], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.didnt_go_well, content="Session timeout bug was discovered late and caused a scramble to fix",
                votes=2, voted_by=[], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.didnt_go_well, content="Documentation for the permissions API was left to the end and feels rushed",
                votes=1, voted_by=[], created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.action_item, content="Add scope review checkpoint mid-sprint to prevent feature creep",
                votes=4, voted_by=[user.id], resolved=True, created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.action_item, content="Write API docs as part of the story definition of done, not after",
                votes=3, voted_by=[user.id], resolved=False, created_by=user.id, created_at=now - timedelta(days=4)),
            RetroItem(id=str(uuid4()), sprint_id=sprint_p1_13.id, project_id=project1.id,
                column=RetroColumn.action_item, content="Set up automated regression tests for auth flows to catch bugs earlier",
                votes=2, voted_by=[], resolved=False, created_by=user.id, created_at=now - timedelta(days=4)),
        ]
        db.add_all(retro_items_s13)
        db.flush()

        # ---- Activity Logs ----
        print("Creating activity logs...")
        activities = [
            ActivityLog(id=str(uuid4()), project_id=project1.id, user_id=user.id,
                action=ActionType.created, entity_type=EntityType.backlog_item, entity_id=items_p1[0].id,
                details={"title": "User authentication with OAuth 2.0", "type": "story"},
                created_at=now - timedelta(days=3)),
            ActivityLog(id=str(uuid4()), project_id=project1.id, user_id=user.id,
                action=ActionType.moved, entity_type=EntityType.backlog_item, entity_id=items_p1[0].id,
                details={"title": "User authentication with OAuth 2.0", "from_status": "todo", "to_status": "in_progress"},
                created_at=now - timedelta(days=2)),
            ActivityLog(id=str(uuid4()), project_id=project1.id, user_id=user.id,
                action=ActionType.completed, entity_type=EntityType.backlog_item, entity_id=items_p1[3].id,
                details={"title": "API rate limiting middleware", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(days=1)),
            ActivityLog(id=str(uuid4()), project_id=project1.id, user_id=user.id,
                action=ActionType.completed, entity_type=EntityType.backlog_item, entity_id=items_p1[6].id,
                details={"title": "Refactor database query optimization", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(hours=12)),
            ActivityLog(id=str(uuid4()), project_id=project1.id, user_id=user.id,
                action=ActionType.created, entity_type=EntityType.sprint, entity_id=sprint1.id,
                details={"name": "Sprint 14"}, created_at=now - timedelta(days=5)),
            ActivityLog(id=str(uuid4()), project_id=project2.id, user_id=user.id,
                action=ActionType.created, entity_type=EntityType.backlog_item, entity_id=items_p2[0].id,
                details={"title": "Patient intake form builder", "type": "story"},
                created_at=now - timedelta(days=4)),
            ActivityLog(id=str(uuid4()), project_id=project2.id, user_id=user.id,
                action=ActionType.completed, entity_type=EntityType.backlog_item, entity_id=items_p2[2].id,
                details={"title": "Fix prescription dosage validation bug", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(hours=6)),
            ActivityLog(id=str(uuid4()), project_id=project2.id, user_id=user.id,
                action=ActionType.updated, entity_type=EntityType.backlog_item, entity_id=items_p2[1].id,
                details={"title": "Appointment scheduling with calendar sync", "field": "assignee"},
                created_at=now - timedelta(hours=3)),
        ]
        db.add_all(activities)

        db.commit()
        print("Seed data created successfully!")
        print(f"  User: {user.email} (password: password123)")
        print(f"  Projects: {project1.name}, {project2.name}")
        total_items = len(items_s12) + len(items_s13) + len(items_p1) + len(items_s7) + len(items_p2)
        print(f"  Backlog items: {total_items}")
        print(f"  Sprints: S12, S13 (completed), S14 (active), S15 (planning), S7 (completed), S8 (planning)")
        print(f"  Daily snapshots: created for S12, S13, S14, S7")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
