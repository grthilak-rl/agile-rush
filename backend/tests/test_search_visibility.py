"""
Test search visibility rules.
Verifies search only returns results from accessible projects.
"""

import pytest
from tests.conftest import (
    get_auth_headers,
    create_backlog_item,
)


class TestSearchVisibility:
    """Verify search only returns results from accessible projects."""

    def test_search_returns_only_accessible_items(
        self, client, user_stranger, org_project, db_session
    ):
        """Stranger searching should NOT find items in org projects."""
        create_backlog_item(db_session, org_project.id, "SecretFeature99")
        response = client.get(
            "/api/search?q=SecretFeature99",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_member_search_finds_org_items(
        self, client, user_bob, org_project, org_techcorp, db_session
    ):
        """Bob (org member) should find items in org project."""
        create_backlog_item(db_session, org_project.id, "VisibleFeature88")
        response = client.get(
            "/api/search?q=VisibleFeature88",
            headers=get_auth_headers(user_bob),
        )
        assert response.status_code == 200
        assert response.json()["total"] > 0

    def test_owner_search_finds_own_items(
        self, client, user_rajthilak, personal_project, db_session
    ):
        """Owner should find items in their own project."""
        create_backlog_item(db_session, personal_project.id, "MyOwnItem77")
        response = client.get(
            "/api/search?q=MyOwnItem77",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        assert response.json()["total"] > 0

    def test_stranger_cannot_find_personal_project_items(
        self, client, user_stranger, personal_project, db_session
    ):
        """Stranger should NOT find items in another user's personal project."""
        create_backlog_item(
            db_session, personal_project.id, "PersonalSecret66"
        )
        response = client.get(
            "/api/search?q=PersonalSecret66",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_search_finds_project_by_name(
        self, client, user_rajthilak, org_project, org_techcorp
    ):
        """Search can find projects by name."""
        response = client.get(
            f"/api/search?q={org_project.name}",
            headers=get_auth_headers(user_rajthilak),
        )
        assert response.status_code == 200
        project_results = response.json()["results"]["projects"]
        project_ids = [p["id"] for p in project_results]
        assert str(org_project.id) in project_ids

    def test_stranger_cannot_find_project_by_name(
        self, client, user_stranger, org_project
    ):
        """Stranger cannot find inaccessible projects by name."""
        response = client.get(
            f"/api/search?q={org_project.name}",
            headers=get_auth_headers(user_stranger),
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_new_user_search_returns_empty(self, client, db_session):
        """User with no projects gets empty search results."""
        from tests.conftest import create_user

        new_user = create_user(db_session, "searcher@test.com", "Searcher")
        response = client.get(
            "/api/search?q=anything",
            headers=get_auth_headers(new_user),
        )
        assert response.status_code == 200
        assert response.json()["total"] == 0
