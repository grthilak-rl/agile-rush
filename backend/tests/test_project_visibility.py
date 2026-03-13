"""
Test project visibility rules.
Verifies users can ONLY see projects they have access to.
"""

import pytest
from tests.conftest import (
    get_auth_headers,
    create_user,
    add_project_member,
)


class TestProjectVisibility:
    """Verify users can ONLY see projects they have access to."""

    def test_user_sees_own_personal_projects(
        self, client, user_rajthilak, personal_project
    ):
        """Rajthilak should see his personal project."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        assert response.status_code == 200
        project_ids = [p["id"] for p in response.json()]
        assert str(personal_project.id) in project_ids

    def test_user_sees_org_projects(
        self, client, user_rajthilak, org_project, org_techcorp
    ):
        """Rajthilak should see TechCorp org projects (he's the owner)."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) in project_ids

    def test_org_member_sees_org_projects(
        self, client, user_bob, org_project, org_techcorp
    ):
        """Bob (org member) should see TechCorp org projects."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_bob)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) in project_ids

    def test_org_admin_sees_org_projects(
        self, client, user_alice, org_project, org_techcorp
    ):
        """Alice (org admin) should see TechCorp org projects."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_alice)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) in project_ids

    def test_user_cannot_see_others_personal_projects(
        self, client, user_rajthilak, alice_personal_project
    ):
        """Rajthilak should NOT see Alice's personal project."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(alice_personal_project.id) not in project_ids

    def test_stranger_cannot_see_org_projects(
        self, client, user_stranger, org_project
    ):
        """Stranger (not in org) should NOT see TechCorp projects."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_stranger)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) not in project_ids

    def test_stranger_sees_only_own_projects(
        self, client, user_stranger, stranger_project, personal_project, org_project
    ):
        """Stranger should ONLY see their own project, nothing else."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_stranger)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(stranger_project.id) in project_ids
        assert str(personal_project.id) not in project_ids
        assert str(org_project.id) not in project_ids

    def test_new_user_sees_zero_projects(self, client, db_session):
        """A freshly registered user should see 0 projects."""
        new_user = create_user(db_session, "new@test.com", "New User")
        response = client.get(
            "/api/projects", headers=get_auth_headers(new_user)
        )
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_invited_member_sees_personal_project(
        self, client, user_alice, personal_project, db_session
    ):
        """Alice should see Rajthilak's personal project if she's a direct ProjectMember."""
        add_project_member(
            db_session, personal_project.id, user_alice.id, role="member"
        )
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_alice)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(personal_project.id) in project_ids

    def test_user_sees_both_personal_and_org_projects(
        self, client, user_rajthilak, personal_project, org_project, org_techcorp
    ):
        """Owner should see both personal and org projects."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(personal_project.id) in project_ids
        assert str(org_project.id) in project_ids

    def test_unauthenticated_cannot_list_projects(self, client):
        """Unauthenticated requests should be rejected."""
        response = client.get("/api/projects")
        assert response.status_code == 403

    def test_project_response_includes_org_info(
        self, client, user_rajthilak, org_project, org_techcorp
    ):
        """Org projects should include organization info in the response."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        projects = response.json()
        org_proj = next(
            (p for p in projects if p["id"] == str(org_project.id)), None
        )
        assert org_proj is not None
        assert org_proj["org_id"] == str(org_techcorp.id)
        assert org_proj["is_personal"] is False

    def test_personal_project_marked_as_personal(
        self, client, user_rajthilak, personal_project
    ):
        """Personal projects should have is_personal=True and org_id=None."""
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_rajthilak)
        )
        projects = response.json()
        pers_proj = next(
            (p for p in projects if p["id"] == str(personal_project.id)), None
        )
        assert pers_proj is not None
        assert pers_proj["org_id"] is None
        assert pers_proj["is_personal"] is True
