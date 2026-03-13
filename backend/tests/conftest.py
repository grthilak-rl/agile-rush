import os
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Use SQLite for tests
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key"

from app.database import Base, get_db
from app.main import app
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.models.project import Project
from app.models.organization import Organization, OrgPlan, PLAN_MAX_MEMBERS
from app.models.org_member import OrgMember, OrgRole, OrgMemberStatus
from app.models.project_member import ProjectMember, MemberRole, MemberStatus
from app.models.backlog_item import BacklogItem, ItemType, Priority, ItemStatus


# Create in-memory SQLite engine for testing
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with a test database session."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ── User Fixtures ──


def create_user(db, email, full_name, password="password123"):
    """Helper to create a user directly in the database."""
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def user_rajthilak(db_session):
    """Primary user — will be org owner."""
    return create_user(db_session, "raj@agile-rush.com", "Rajthilak")


@pytest.fixture
def user_alice(db_session):
    """Second user — will be org admin."""
    return create_user(db_session, "alice@techcorp.io", "Alice Johnson")


@pytest.fixture
def user_bob(db_session):
    """Third user — will be org member."""
    return create_user(db_session, "bob@startup.io", "Bob Martinez")


@pytest.fixture
def user_stranger(db_session):
    """Fourth user — NOT in any org, no project access."""
    return create_user(db_session, "charlie@random.io", "Charlie Stranger")


# ── Organization Fixtures ──


@pytest.fixture
def org_techcorp(db_session, user_rajthilak, user_alice, user_bob):
    """Organization owned by Rajthilak, Alice as admin, Bob as member."""
    org = Organization(
        name="TechCorp",
        slug="techcorp",
        description="Test organization",
        owner_id=user_rajthilak.id,
        plan=OrgPlan.free,
        max_members=PLAN_MAX_MEMBERS[OrgPlan.free],
    )
    db_session.add(org)
    db_session.flush()

    # Owner membership
    owner_member = OrgMember(
        org_id=org.id,
        user_id=user_rajthilak.id,
        role=OrgRole.owner,
        status=OrgMemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db_session.add(owner_member)

    # Alice as admin
    alice_member = OrgMember(
        org_id=org.id,
        user_id=user_alice.id,
        role=OrgRole.admin,
        status=OrgMemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db_session.add(alice_member)

    # Bob as member
    bob_member = OrgMember(
        org_id=org.id,
        user_id=user_bob.id,
        role=OrgRole.member,
        status=OrgMemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db_session.add(bob_member)

    db_session.commit()
    db_session.refresh(org)
    return org


# ── Project Fixtures ──


@pytest.fixture
def personal_project(db_session, user_rajthilak):
    """Personal project owned by Rajthilak, org_id = NULL."""
    project = Project(
        name="Raj Personal Project",
        owner_id=user_rajthilak.id,
        org_id=None,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def org_project(db_session, user_rajthilak, org_techcorp):
    """Project inside TechCorp org."""
    project = Project(
        name="TechCorp Platform",
        owner_id=user_rajthilak.id,
        org_id=org_techcorp.id,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def alice_personal_project(db_session, user_alice):
    """Personal project owned by Alice — Rajthilak should NOT see this."""
    project = Project(
        name="Alice Secret Project",
        owner_id=user_alice.id,
        org_id=None,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def stranger_project(db_session, user_stranger):
    """Project owned by stranger — nobody else should see this."""
    project = Project(
        name="Stranger Project",
        owner_id=user_stranger.id,
        org_id=None,
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


# ── Auth Helpers ──


def get_auth_headers(user):
    """Generate JWT token for user and return auth headers."""
    token = create_access_token(str(user.id), user.full_name)
    return {"Authorization": f"Bearer {token}"}


# ── Data Helpers ──


def add_project_member(db, project_id, user_id, role="member"):
    """Add a user as a direct project member."""
    member = ProjectMember(
        project_id=project_id,
        user_id=user_id,
        role=MemberRole(role),
        status=MemberStatus.active,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def create_backlog_item(db, project_id, title, description=None):
    """Create a backlog item in a project."""
    item = BacklogItem(
        title=title,
        description=description,
        project_id=project_id,
        type=ItemType.story,
        priority=Priority.medium,
        status=ItemStatus.backlog,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_org_member(db, org_id, user_id):
    """Get the OrgMember record for a user in an org."""
    return db.query(OrgMember).filter(
        OrgMember.org_id == org_id,
        OrgMember.user_id == user_id,
    ).first()
