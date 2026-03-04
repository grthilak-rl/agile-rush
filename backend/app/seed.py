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
        sprint1 = Sprint(
            id=str(uuid4()),
            project_id=project1.id,
            name="Sprint 14",
            goal="Complete OAuth 2.0 integration and dashboard analytics MVP",
            sprint_number=14,
            duration_weeks=2,
            start_date=date.today() - timedelta(days=5),
            end_date=date.today() + timedelta(days=9),
            status=SprintStatus.active,
        )
        sprint2 = Sprint(
            id=str(uuid4()),
            project_id=project2.id,
            name="Sprint 8",
            goal="Implement patient intake forms and appointment scheduling",
            sprint_number=8,
            duration_weeks=2,
            status=SprintStatus.planning,
        )
        db.add_all([sprint1, sprint2])
        db.flush()

        # ---- Backlog Items for Project 1 (Phoenix Platform) ----
        print("Creating backlog items for Phoenix Platform...")
        items_p1 = [
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=sprint1.id,
                title="User authentication with OAuth 2.0",
                description="Implement OAuth 2.0 authentication flow supporting Google, GitHub, and Microsoft providers. Include token refresh and session management.",
                type=ItemType.story,
                priority=Priority.critical,
                status=ItemStatus.in_progress,
                story_points=8,
                position=1,
                assignee_id=user.id,
                labels=["auth", "security"],
                acceptance_criteria=[
                    {"text": "Users can sign in with Google OAuth", "checked": True},
                    {"text": "Users can sign in with GitHub OAuth", "checked": True},
                    {"text": "Token refresh works automatically", "checked": False},
                    {"text": "Session persists across browser restarts", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=sprint1.id,
                title="Dashboard analytics widgets",
                description="Build interactive analytics widgets for the main dashboard including charts for revenue, user growth, and engagement metrics.",
                type=ItemType.story,
                priority=Priority.high,
                status=ItemStatus.todo,
                story_points=13,
                position=2,
                assignee_id=user.id,
                labels=["dashboard", "charts"],
                acceptance_criteria=[
                    {"text": "Revenue chart displays last 30 days data", "checked": False},
                    {"text": "User growth chart shows weekly trends", "checked": False},
                    {"text": "Widgets are responsive on all screen sizes", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=sprint1.id,
                title="Fix memory leak in WebSocket connection",
                description="Investigate and fix the memory leak occurring in long-running WebSocket connections that causes the server to crash after 24 hours.",
                type=ItemType.bug,
                priority=Priority.critical,
                status=ItemStatus.in_review,
                story_points=5,
                position=3,
                assignee_id=user.id,
                labels=["performance", "critical-fix"],
                acceptance_criteria=[
                    {"text": "No memory growth after 48 hours of continuous connection", "checked": True},
                    {"text": "WebSocket reconnection handles gracefully", "checked": True},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=sprint1.id,
                title="API rate limiting middleware",
                description="Implement rate limiting for all API endpoints with configurable limits per user tier.",
                type=ItemType.task,
                priority=Priority.medium,
                status=ItemStatus.done,
                story_points=3,
                position=4,
                assignee_id=user.id,
                labels=["api", "security"],
                acceptance_criteria=[
                    {"text": "Free tier limited to 100 requests/minute", "checked": True},
                    {"text": "Pro tier limited to 1000 requests/minute", "checked": True},
                    {"text": "Rate limit headers included in responses", "checked": True},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=None,
                title="Multi-tenant data isolation",
                description="Implement row-level security and tenant isolation for the multi-tenant architecture.",
                type=ItemType.story,
                priority=Priority.high,
                status=ItemStatus.backlog,
                story_points=13,
                position=5,
                assignee_id=None,
                labels=["architecture", "security"],
                acceptance_criteria=[
                    {"text": "Tenant data is completely isolated", "checked": False},
                    {"text": "Cross-tenant queries are impossible", "checked": False},
                    {"text": "Performance impact is less than 5%", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=None,
                title="Export data to CSV and PDF",
                description="Allow users to export their data, reports, and analytics to CSV and PDF formats.",
                type=ItemType.story,
                priority=Priority.low,
                status=ItemStatus.backlog,
                story_points=5,
                position=6,
                assignee_id=None,
                labels=["export", "reports"],
                acceptance_criteria=[
                    {"text": "CSV export includes all visible columns", "checked": False},
                    {"text": "PDF export uses branded template", "checked": False},
                    {"text": "Large exports are handled asynchronously", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=sprint1.id,
                title="Refactor database query optimization",
                description="Optimize slow database queries identified in the APM tool. Focus on N+1 queries and missing indexes.",
                type=ItemType.task,
                priority=Priority.medium,
                status=ItemStatus.done,
                story_points=3,
                position=7,
                assignee_id=user.id,
                labels=["performance", "database"],
                acceptance_criteria=[
                    {"text": "All N+1 queries eliminated", "checked": True},
                    {"text": "Average query time reduced by 50%", "checked": True},
                    {"text": "Missing indexes added", "checked": True},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project1.id,
                sprint_id=None,
                title="Notification system with email and push",
                description="Build a comprehensive notification system supporting in-app, email, and push notifications.",
                type=ItemType.story,
                priority=Priority.medium,
                status=ItemStatus.backlog,
                story_points=8,
                position=8,
                assignee_id=None,
                labels=["notifications", "email"],
                acceptance_criteria=[
                    {"text": "Users receive in-app notifications in real-time", "checked": False},
                    {"text": "Email notifications sent for critical events", "checked": False},
                    {"text": "Push notifications work on mobile devices", "checked": False},
                    {"text": "Users can configure notification preferences", "checked": False},
                ],
            ),
        ]
        db.add_all(items_p1)
        db.flush()

        # ---- Backlog Items for Project 2 (MedConnect Portal) ----
        print("Creating backlog items for MedConnect Portal...")
        items_p2 = [
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=sprint2.id,
                title="Patient intake form builder",
                description="Create a drag-and-drop form builder for custom patient intake forms with HIPAA-compliant data handling.",
                type=ItemType.story,
                priority=Priority.critical,
                status=ItemStatus.todo,
                story_points=13,
                position=1,
                assignee_id=user.id,
                labels=["forms", "hipaa"],
                acceptance_criteria=[
                    {"text": "Forms support text, checkbox, dropdown, and signature fields", "checked": False},
                    {"text": "Form data is encrypted at rest", "checked": False},
                    {"text": "Forms can be shared via secure link", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=sprint2.id,
                title="Appointment scheduling with calendar sync",
                description="Implement appointment booking system with Google Calendar and Outlook integration for providers.",
                type=ItemType.story,
                priority=Priority.high,
                status=ItemStatus.in_progress,
                story_points=8,
                position=2,
                assignee_id=user.id,
                labels=["scheduling", "calendar"],
                acceptance_criteria=[
                    {"text": "Patients can book from available time slots", "checked": True},
                    {"text": "Providers see appointments synced with their calendar", "checked": False},
                    {"text": "Automated reminders sent 24 hours before", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=sprint2.id,
                title="Fix prescription dosage validation bug",
                description="Fix the bug where prescription dosage validation allows values exceeding maximum safe limits for certain medications.",
                type=ItemType.bug,
                priority=Priority.critical,
                status=ItemStatus.done,
                story_points=2,
                position=3,
                assignee_id=user.id,
                labels=["prescription", "critical-fix"],
                acceptance_criteria=[
                    {"text": "Dosage validation checks against medication database", "checked": True},
                    {"text": "Warning displayed for doses near maximum", "checked": True},
                    {"text": "Error prevents submission for doses exceeding maximum", "checked": True},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=None,
                title="Telemedicine video consultation",
                description="Integrate WebRTC-based video consultation feature for remote patient appointments.",
                type=ItemType.story,
                priority=Priority.high,
                status=ItemStatus.backlog,
                story_points=13,
                position=4,
                assignee_id=None,
                labels=["telemedicine", "video"],
                acceptance_criteria=[
                    {"text": "Stable video call between patient and provider", "checked": False},
                    {"text": "Screen sharing capability", "checked": False},
                    {"text": "Recording with patient consent", "checked": False},
                    {"text": "Works on mobile browsers", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=None,
                title="EHR integration with HL7 FHIR",
                description="Build HL7 FHIR-compliant integration layer for exchanging patient records with external EHR systems.",
                type=ItemType.task,
                priority=Priority.medium,
                status=ItemStatus.backlog,
                story_points=8,
                position=5,
                assignee_id=None,
                labels=["ehr", "fhir", "integration"],
                acceptance_criteria=[
                    {"text": "Patient demographics sync with external EHR", "checked": False},
                    {"text": "Lab results imported automatically", "checked": False},
                    {"text": "Medication list stays in sync", "checked": False},
                ],
            ),
            BacklogItem(
                id=str(uuid4()),
                project_id=project2.id,
                sprint_id=sprint2.id,
                title="Patient portal accessibility audit",
                description="Conduct and fix WCAG 2.1 AA compliance issues across the patient-facing portal.",
                type=ItemType.task,
                priority=Priority.medium,
                status=ItemStatus.todo,
                story_points=5,
                position=6,
                assignee_id=user.id,
                labels=["accessibility", "compliance"],
                acceptance_criteria=[
                    {"text": "All pages pass WCAG 2.1 AA automated checks", "checked": True},
                    {"text": "Screen reader navigation tested and working", "checked": False},
                    {"text": "Color contrast meets minimum ratios", "checked": True},
                ],
            ),
        ]
        db.add_all(items_p2)
        db.flush()

        # ---- Activity Logs ----
        print("Creating activity logs...")
        activities = [
            ActivityLog(
                id=str(uuid4()),
                project_id=project1.id,
                user_id=user.id,
                action=ActionType.created,
                entity_type=EntityType.backlog_item,
                entity_id=items_p1[0].id,
                details={"title": "User authentication with OAuth 2.0", "type": "story"},
                created_at=now - timedelta(days=3),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project1.id,
                user_id=user.id,
                action=ActionType.moved,
                entity_type=EntityType.backlog_item,
                entity_id=items_p1[0].id,
                details={"title": "User authentication with OAuth 2.0", "from_status": "todo", "to_status": "in_progress"},
                created_at=now - timedelta(days=2),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project1.id,
                user_id=user.id,
                action=ActionType.completed,
                entity_type=EntityType.backlog_item,
                entity_id=items_p1[3].id,
                details={"title": "API rate limiting middleware", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(days=1),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project1.id,
                user_id=user.id,
                action=ActionType.completed,
                entity_type=EntityType.backlog_item,
                entity_id=items_p1[6].id,
                details={"title": "Refactor database query optimization", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(hours=12),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project1.id,
                user_id=user.id,
                action=ActionType.created,
                entity_type=EntityType.sprint,
                entity_id=sprint1.id,
                details={"name": "Sprint 14"},
                created_at=now - timedelta(days=5),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project2.id,
                user_id=user.id,
                action=ActionType.created,
                entity_type=EntityType.backlog_item,
                entity_id=items_p2[0].id,
                details={"title": "Patient intake form builder", "type": "story"},
                created_at=now - timedelta(days=4),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project2.id,
                user_id=user.id,
                action=ActionType.completed,
                entity_type=EntityType.backlog_item,
                entity_id=items_p2[2].id,
                details={"title": "Fix prescription dosage validation bug", "from_status": "in_review", "to_status": "done"},
                created_at=now - timedelta(hours=6),
            ),
            ActivityLog(
                id=str(uuid4()),
                project_id=project2.id,
                user_id=user.id,
                action=ActionType.updated,
                entity_type=EntityType.backlog_item,
                entity_id=items_p2[1].id,
                details={"title": "Appointment scheduling with calendar sync", "field": "assignee"},
                created_at=now - timedelta(hours=3),
            ),
        ]
        db.add_all(activities)

        db.commit()
        print("Seed data created successfully!")
        print(f"  User: {user.email} (password: password123)")
        print(f"  Projects: {project1.name}, {project2.name}")
        print(f"  Sprints: {sprint1.name} (active), {sprint2.name} (planning)")
        print(f"  Backlog items: {len(items_p1)} + {len(items_p2)} = {len(items_p1) + len(items_p2)}")
        print(f"  Activity logs: {len(activities)}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
