"""
Test that pending invitations auto-link when a user registers.
"""

import pytest
from tests.conftest import get_auth_headers


class TestRegistrationAutoLink:
    """Verify pending invitations auto-link on registration."""

    def test_org_invite_links_on_registration(
        self, client, user_rajthilak, org_techcorp
    ):
        """Invite email -> user registers with that email -> sees notification."""
        # 1. Invite non-existent user
        invite_resp = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "future@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert invite_resp.status_code == 200

        # 2. That person registers
        register_resp = client.post(
            "/api/auth/register",
            json={
                "email": "future@test.com",
                "full_name": "Future User",
                "password": "password123",
            },
        )
        assert register_resp.status_code == 201
        token = register_resp.json()["access_token"]

        # 3. They should have a notification about the org invitation
        notifications = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert notifications.status_code == 200
        notif_messages = [
            n["message"]
            for n in notifications.json()["notifications"]
        ]
        assert any("TechCorp" in msg for msg in notif_messages)

    def test_org_invite_user_can_accept_after_register(
        self, client, user_rajthilak, org_techcorp
    ):
        """After registering with a pending invite, user can accept and see org projects."""
        # Invite
        client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "joiner@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )

        # Register
        register_resp = client.post(
            "/api/auth/register",
            json={
                "email": "joiner@test.com",
                "full_name": "Joiner User",
                "password": "password123",
            },
        )
        token = register_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Accept org invitation
        accept_resp = client.post(
            f"/api/organizations/{org_techcorp.id}/members/accept",
            headers=headers,
        )
        assert accept_resp.status_code == 200

        # Verify: user now sees org in their list
        orgs_resp = client.get("/api/organizations", headers=headers)
        assert orgs_resp.status_code == 200
        org_ids = [o["id"] for o in orgs_resp.json()]
        assert str(org_techcorp.id) in org_ids

    def test_project_invite_links_on_registration(
        self, client, user_rajthilak, personal_project
    ):
        """Invite email to project -> user registers -> sees notification."""
        # 1. Invite non-existent user to project
        invite_resp = client.post(
            f"/api/projects/{personal_project.id}/members/invite",
            json={"email": "projectinvitee@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert invite_resp.status_code == 200

        # 2. Register
        register_resp = client.post(
            "/api/auth/register",
            json={
                "email": "projectinvitee@test.com",
                "full_name": "Project Invitee",
                "password": "password123",
            },
        )
        assert register_resp.status_code == 201
        token = register_resp.json()["access_token"]

        # 3. Check notifications exist for the invitation
        notifications = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert notifications.status_code == 200
        notif_messages = [
            n["message"]
            for n in notifications.json()["notifications"]
        ]
        assert any(
            personal_project.name in msg for msg in notif_messages
        )

    def test_no_invite_no_notification(self, client):
        """User registering without any pending invites should have no notifications."""
        register_resp = client.post(
            "/api/auth/register",
            json={
                "email": "noinvite@test.com",
                "full_name": "No Invite",
                "password": "password123",
            },
        )
        assert register_resp.status_code == 201
        token = register_resp.json()["access_token"]

        notifications = client.get(
            "/api/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert notifications.status_code == 200
        assert notifications.json()["total"] == 0
