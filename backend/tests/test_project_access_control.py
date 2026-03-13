"""
Test project-scoped endpoint access control.
Verifies that unauthorized users get 404 on all project endpoints (not 403, to avoid leaking existence).
"""

import pytest
from tests.conftest import (
    get_auth_headers,
    create_backlog_item,
)


class TestProjectAccessControl:
    """Verify that unauthorized users get 404 on all project endpoints."""

    def test_stranger_cannot_access_project_detail(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404  # NOT 403 — don't leak existence

    def test_stranger_cannot_access_backlog(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/backlog",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_sprints(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/sprints",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_stats(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/stats",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_activity(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/activity",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_update_project(
        self, client, user_stranger, org_project
    ):
        response = client.patch(
            f"/api/projects/{org_project.id}",
            json={"name": "Hacked"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_update_project_settings(
        self, client, user_stranger, org_project
    ):
        response = client.patch(
            f"/api/projects/{org_project.id}/settings",
            json={"name": "Hacked"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_create_backlog_item(
        self, client, user_stranger, org_project
    ):
        response = client.post(
            f"/api/projects/{org_project.id}/backlog",
            json={"title": "Injected"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_delete_project(
        self, client, user_stranger, org_project
    ):
        response = client.delete(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_members(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/members",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_retro(
        self, client, user_stranger, org_project
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/retro",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_move_project_to_org(
        self, client, user_stranger, org_project
    ):
        response = client.post(
            f"/api/projects/{org_project.id}/move-to-org",
            json={"org_id": "some-org-id"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_move_project_to_personal(
        self, client, user_stranger, org_project
    ):
        response = client.post(
            f"/api/projects/{org_project.id}/move-to-personal",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_stranger_cannot_access_backlog_item_detail(
        self, client, user_stranger, org_project, db_session
    ):
        item = create_backlog_item(db_session, org_project.id, "Test Item")
        response = client.get(
            f"/api/projects/{org_project.id}/backlog/{item.id}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_nonexistent_project_returns_404(
        self, client, user_rajthilak
    ):
        response = client.get(
            "/api/projects/nonexistent-uuid-12345",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 404


class TestProjectAccessControlPositive:
    """Verify that authorized users CAN access project endpoints."""

    def test_owner_can_access_project_detail(
        self, client, user_rajthilak, org_project, org_techcorp
    ):
        response = client.get(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

    def test_member_can_access_org_project(
        self, client, user_bob, org_project, org_techcorp
    ):
        """Bob (org member) CAN access org project endpoints."""
        response = client.get(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 200

    def test_member_can_access_backlog(
        self, client, user_bob, org_project, org_techcorp
    ):
        response = client.get(
            f"/api/projects/{org_project.id}/backlog",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 200

    def test_admin_can_access_org_project(
        self, client, user_alice, org_project, org_techcorp
    ):
        """Alice (org admin) CAN access org project endpoints."""
        response = client.get(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 200

    def test_owner_can_access_personal_project(
        self, client, user_rajthilak, personal_project
    ):
        response = client.get(
            f"/api/projects/{personal_project.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

    def test_member_can_create_backlog_item(
        self, client, user_bob, org_project, org_techcorp
    ):
        """Org member can create backlog items."""
        response = client.post(
            f"/api/projects/{org_project.id}/backlog",
            json={"title": "New Item from Bob"},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 201

    def test_member_cannot_update_project(
        self, client, user_bob, org_project, org_techcorp
    ):
        """Org member (mapped to member role) cannot update project settings (requires admin)."""
        response = client.patch(
            f"/api/projects/{org_project.id}",
            json={"name": "Changed by member"},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_admin_can_update_project(
        self, client, user_alice, org_project, org_techcorp
    ):
        """Org admin CAN update project settings."""
        response = client.patch(
            f"/api/projects/{org_project.id}",
            json={"name": "Updated by admin"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated by admin"
