import pytest


class TestRegister:
    def test_register_success(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "full_name": "Test User",
                "password": "testpassword123",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["full_name"] == "Test User"
        assert "id" in data["user"]
        assert "created_at" in data["user"]

    def test_register_duplicate_email(self, client):
        # Register first user
        client.post(
            "/api/auth/register",
            json={
                "email": "duplicate@example.com",
                "full_name": "First User",
                "password": "password123",
            },
        )
        # Try to register with same email
        response = client.post(
            "/api/auth/register",
            json={
                "email": "duplicate@example.com",
                "full_name": "Second User",
                "password": "password456",
            },
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        response = client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "full_name": "Test User",
                "password": "testpassword123",
            },
        )
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        # First register
        client.post(
            "/api/auth/register",
            json={
                "email": "login@example.com",
                "full_name": "Login User",
                "password": "loginpassword",
            },
        )
        # Then login
        response = client.post(
            "/api/auth/login",
            json={
                "email": "login@example.com",
                "password": "loginpassword",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "login@example.com"

    def test_login_wrong_password(self, client):
        # First register
        client.post(
            "/api/auth/register",
            json={
                "email": "wrong@example.com",
                "full_name": "Wrong User",
                "password": "correctpassword",
            },
        )
        # Login with wrong password
        response = client.post(
            "/api/auth/login",
            json={
                "email": "wrong@example.com",
                "password": "wrongpassword",
            },
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "somepassword",
            },
        )
        assert response.status_code == 401


class TestMe:
    def test_get_me_success(self, client):
        # Register and get token
        register_response = client.post(
            "/api/auth/register",
            json={
                "email": "me@example.com",
                "full_name": "Me User",
                "password": "mepassword",
            },
        )
        token = register_response.json()["access_token"]

        # Get current user
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "me@example.com"
        assert data["full_name"] == "Me User"

    def test_get_me_no_token(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 403

    def test_get_me_invalid_token(self, client):
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"},
        )
        assert response.status_code == 401


class TestLogout:
    def test_logout(self, client):
        response = client.post("/api/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"
