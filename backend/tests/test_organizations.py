"""
Test organization CRUD, member management, and org projects.
"""

import pytest
from tests.conftest import (
    get_auth_headers,
    create_user,
    get_org_member,
)


class TestOrganizationCRUD:

    def test_create_organization(self, client, user_rajthilak):
        response = client.post(
            "/api/organizations",
            json={"name": "NewOrg", "description": "Test org"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "NewOrg"
        assert data["slug"] == "neworg"
        assert data["my_role"] == "owner"
        assert data["member_count"] == 1

    def test_create_org_generates_unique_slug(self, client, user_rajthilak, user_alice):
        """Two orgs with same name should get different slugs."""
        r1 = client.post(
            "/api/organizations",
            json={"name": "MyOrg"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert r1.status_code == 201
        assert r1.json()["slug"] == "myorg"

        r2 = client.post(
            "/api/organizations",
            json={"name": "MyOrg"},
            headers=get_auth_headers(user_alice),
        )
        assert r2.status_code == 201
        assert r2.json()["slug"] != "myorg"  # Should be "myorg-2" or similar

    def test_create_org_empty_name_fails(self, client, user_rajthilak):
        response = client.post(
            "/api/organizations",
            json={"name": "   "},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 400

    def test_list_organizations_only_mine(
        self, client, user_stranger, org_techcorp
    ):
        """Stranger should not see TechCorp."""
        response = client.get(
            "/api/organizations",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 200
        org_ids = [o["id"] for o in response.json()]
        assert str(org_techcorp.id) not in org_ids

    def test_org_owner_can_see_org(
        self, client, user_rajthilak, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "TechCorp"

    def test_org_member_can_see_org(
        self, client, user_bob, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 200

    def test_stranger_cannot_see_org(
        self, client, user_stranger, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_get_org_by_slug(self, client, user_rajthilak, org_techcorp):
        response = client.get(
            f"/api/organizations/by-slug/{org_techcorp.slug}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert response.json()["id"] == str(org_techcorp.id)

    def test_stranger_cannot_get_org_by_slug(
        self, client, user_stranger, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/by-slug/{org_techcorp.slug}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_update_org_as_owner(self, client, user_rajthilak, org_techcorp):
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}",
            json={"name": "TechCorp Updated"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert response.json()["name"] == "TechCorp Updated"

    def test_update_org_as_admin(self, client, user_alice, org_techcorp):
        """Admin can update org."""
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}",
            json={"description": "Updated by admin"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 200

    def test_member_cannot_update_org(self, client, user_bob, org_techcorp):
        """Bob is a member, not admin/owner — should not be able to edit."""
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}",
            json={"name": "Hacked"},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_stranger_cannot_update_org(self, client, user_stranger, org_techcorp):
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}",
            json={"name": "Hacked"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_delete_org_requires_owner(self, client, user_alice, org_techcorp):
        """Alice is admin, not owner — cannot delete."""
        response = client.request(
            "DELETE",
            f"/api/organizations/{org_techcorp.id}",
            json={"confirm_name": "TechCorp"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 403

    def test_delete_org_requires_confirm_name(
        self, client, user_rajthilak, org_techcorp
    ):
        response = client.request(
            "DELETE",
            f"/api/organizations/{org_techcorp.id}",
            json={"confirm_name": "WrongName"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 400

    def test_delete_org_success(self, client, user_rajthilak, org_techcorp):
        response = client.request(
            "DELETE",
            f"/api/organizations/{org_techcorp.id}",
            json={"confirm_name": "TechCorp", "transfer_projects": True},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()


class TestOrgMemberManagement:

    def test_list_org_members(self, client, user_rajthilak, org_techcorp):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        members = response.json()
        assert len(members) >= 3  # owner + admin + member

    def test_invite_member_to_org(self, client, user_rajthilak, org_techcorp):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "newperson@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

    def test_member_cannot_invite(self, client, user_bob, org_techcorp):
        """Bob is member — cannot invite others."""
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "another@test.com", "role": "member"},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_admin_can_invite(self, client, user_alice, org_techcorp):
        """Alice is admin — can invite."""
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "fromadmin@test.com", "role": "member"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 200

    def test_cannot_invite_existing_member(
        self, client, user_rajthilak, org_techcorp, user_bob
    ):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": user_bob.email, "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 400  # already a member

    def test_accept_org_invitation(
        self, client, db_session, user_rajthilak, org_techcorp
    ):
        """Invite a user, then accept as that user."""
        new_user = create_user(db_session, "invitee@test.com", "Invitee")
        # Invite
        client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "invitee@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        # Accept
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/accept",
            headers=get_auth_headers(new_user),
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"

    def test_decline_org_invitation(
        self, client, db_session, user_rajthilak, org_techcorp
    ):
        new_user = create_user(db_session, "decliner@test.com", "Decliner")
        client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "decliner@test.com", "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/decline",
            headers=get_auth_headers(new_user),
        )
        assert response.status_code == 200

    def test_remove_member(
        self, client, user_rajthilak, user_bob, org_techcorp, db_session
    ):
        bob_member = get_org_member(db_session, org_techcorp.id, user_bob.id)
        response = client.delete(
            f"/api/organizations/{org_techcorp.id}/members/{bob_member.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

    def test_removed_member_loses_org_project_access(
        self, client, user_rajthilak, user_bob, org_techcorp, org_project, db_session
    ):
        """After removal, Bob can no longer see org projects."""
        # Verify Bob can see org project before removal
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_bob)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) in project_ids

        # Remove Bob
        bob_member = get_org_member(db_session, org_techcorp.id, user_bob.id)
        client.delete(
            f"/api/organizations/{org_techcorp.id}/members/{bob_member.id}",
            headers=get_auth_headers(user_rajthilak),
        )

        # Verify Bob can no longer see org project
        response = client.get(
            "/api/projects", headers=get_auth_headers(user_bob)
        )
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) not in project_ids

    def test_cannot_remove_owner(
        self, client, user_alice, user_rajthilak, org_techcorp, db_session
    ):
        owner_member = get_org_member(
            db_session, org_techcorp.id, user_rajthilak.id
        )
        response = client.delete(
            f"/api/organizations/{org_techcorp.id}/members/{owner_member.id}",
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 400  # Cannot remove owner

    def test_member_cannot_remove_others(
        self, client, user_bob, user_alice, org_techcorp, db_session
    ):
        """Bob (member) cannot remove Alice (admin)."""
        alice_member = get_org_member(
            db_session, org_techcorp.id, user_alice.id
        )
        response = client.delete(
            f"/api/organizations/{org_techcorp.id}/members/{alice_member.id}",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_update_member_role(
        self, client, user_rajthilak, user_bob, org_techcorp, db_session
    ):
        bob_member = get_org_member(db_session, org_techcorp.id, user_bob.id)
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}/members/{bob_member.id}",
            json={"role": "admin"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert response.json()["role"] == "admin"

    def test_cannot_change_owner_role(
        self, client, user_alice, user_rajthilak, org_techcorp, db_session
    ):
        owner_member = get_org_member(
            db_session, org_techcorp.id, user_rajthilak.id
        )
        response = client.patch(
            f"/api/organizations/{org_techcorp.id}/members/{owner_member.id}",
            json={"role": "member"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 400

    def test_transfer_ownership(
        self, client, user_rajthilak, user_alice, org_techcorp
    ):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/transfer-ownership",
            json={"new_owner_id": str(user_alice.id)},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

        # Verify: Alice is now owner
        org = client.get(
            f"/api/organizations/{org_techcorp.id}",
            headers=get_auth_headers(user_alice),
        )
        assert org.json()["owner_id"] == str(user_alice.id)

    def test_non_owner_cannot_transfer(
        self, client, user_alice, user_bob, org_techcorp
    ):
        """Admin cannot transfer ownership."""
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/transfer-ownership",
            json={"new_owner_id": str(user_bob.id)},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 403

    def test_stranger_cannot_list_members(
        self, client, user_stranger, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_invite_invalid_role(self, client, user_rajthilak, org_techcorp):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/members/invite",
            json={"email": "test@test.com", "role": "owner"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 400


class TestProjectMemberAutoAddsToOrg:
    """Adding a member to an org project should auto-add them to the org."""

    def test_add_member_to_org_project_adds_to_org(
        self, client, user_rajthilak, user_stranger, org_techcorp, org_project
    ):
        """Adding stranger to an org project should auto-add them as org member."""
        # Stranger is not in the org
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_rajthilak),
        )
        member_user_ids = [
            m["user_id"] for m in response.json() if m.get("user_id")
        ]
        assert str(user_stranger.id) not in member_user_ids

        # Add stranger to org project
        response = client.post(
            f"/api/projects/{org_project.id}/members/add",
            json={"user_id": str(user_stranger.id), "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

        # Stranger should now be in the org
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_rajthilak),
        )
        member_user_ids = [
            m["user_id"] for m in response.json() if m.get("user_id")
        ]
        assert str(user_stranger.id) in member_user_ids

    def test_add_existing_org_member_to_project_no_duplicate(
        self, client, user_rajthilak, user_bob, org_techcorp, org_project
    ):
        """Bob is already an org member — adding to project should not duplicate org membership."""
        # Bob is already in the org (from fixture)
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_rajthilak),
        )
        bob_count_before = sum(
            1 for m in response.json()
            if m.get("user_id") == str(user_bob.id)
        )
        assert bob_count_before == 1

        # Add Bob directly to the project
        client.post(
            f"/api/projects/{org_project.id}/members/add",
            json={"user_id": str(user_bob.id), "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )

        # Bob should still have exactly 1 org membership
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/members",
            headers=get_auth_headers(user_rajthilak),
        )
        bob_count_after = sum(
            1 for m in response.json()
            if m.get("user_id") == str(user_bob.id)
        )
        assert bob_count_after == 1

    def test_add_member_to_personal_project_no_org_side_effect(
        self, client, db_session, user_rajthilak, user_stranger, personal_project
    ):
        """Adding member to a personal (non-org) project should not create org membership."""
        response = client.post(
            f"/api/projects/{personal_project.id}/members/add",
            json={"user_id": str(user_stranger.id), "role": "member"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200

        # Stranger should have 0 org memberships
        response = client.get(
            "/api/organizations",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 200
        assert len(response.json()) == 0


class TestOrgProjects:

    def test_create_project_in_org(
        self, client, user_rajthilak, org_techcorp
    ):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/projects",
            json={"name": "New Org Project"},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 201
        assert response.json()["org_id"] == str(org_techcorp.id)

    def test_admin_can_create_org_project(
        self, client, user_alice, org_techcorp
    ):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/projects",
            json={"name": "Alice Org Project"},
            headers=get_auth_headers(user_alice),
        )
        assert response.status_code == 201

    def test_member_cannot_create_org_project(
        self, client, user_bob, org_techcorp
    ):
        """Only owner/admin can create org projects."""
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/projects",
            json={"name": "Bob's Project"},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_stranger_cannot_create_org_project(
        self, client, user_stranger, org_techcorp
    ):
        response = client.post(
            f"/api/organizations/{org_techcorp.id}/projects",
            json={"name": "Stranger's Project"},
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_list_org_projects(
        self, client, user_bob, org_techcorp, org_project
    ):
        """Any org member can list org projects."""
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/projects",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 200
        project_ids = [p["id"] for p in response.json()]
        assert str(org_project.id) in project_ids

    def test_stranger_cannot_list_org_projects(
        self, client, user_stranger, org_techcorp
    ):
        response = client.get(
            f"/api/organizations/{org_techcorp.id}/projects",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 404

    def test_move_personal_to_org(
        self, client, user_rajthilak, personal_project, org_techcorp
    ):
        response = client.post(
            f"/api/projects/{personal_project.id}/move-to-org",
            json={"org_id": str(org_techcorp.id)},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        # Verify project now has org_id
        project = client.get(
            f"/api/projects/{personal_project.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert project.json()["org_id"] == str(org_techcorp.id)

    def test_move_org_to_personal(
        self, client, user_rajthilak, org_project, org_techcorp
    ):
        response = client.post(
            f"/api/projects/{org_project.id}/move-to-personal",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        project = client.get(
            f"/api/projects/{org_project.id}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert project.json()["org_id"] is None

    def test_member_cannot_move_project(
        self, client, user_bob, org_project, org_techcorp
    ):
        """Only owner can move projects."""
        response = client.post(
            f"/api/projects/{org_project.id}/move-to-personal",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403

    def test_create_project_via_main_endpoint_with_org_id(
        self, client, user_rajthilak, org_techcorp
    ):
        """Create project via POST /api/projects with org_id."""
        response = client.post(
            "/api/projects",
            json={"name": "Via Main Endpoint", "org_id": str(org_techcorp.id)},
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 201
        assert response.json()["org_id"] == str(org_techcorp.id)

    def test_member_cannot_create_project_via_main_endpoint_with_org_id(
        self, client, user_bob, org_techcorp
    ):
        """Member cannot create org project via main endpoint either."""
        response = client.post(
            "/api/projects",
            json={"name": "Should Fail", "org_id": str(org_techcorp.id)},
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 403
