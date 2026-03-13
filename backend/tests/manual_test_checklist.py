"""
AgileRush — Organization & Visibility Manual API Test Script

Run: python -m tests.manual_test_checklist --base-url http://localhost:8000

This script:
1. Creates test users
2. Creates an organization
3. Creates projects (personal + org)
4. Verifies visibility rules
5. Prints PASS/FAIL for each check
"""

import argparse
import sys
import requests

results = []


def log(test_name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    emoji = "  [OK]" if passed else "  [!!]"
    results.append((test_name, passed))
    suffix = f" -- {detail}" if detail else ""
    print(f"{emoji}  {status}  {test_name}{suffix}")


def register(api, email, name, password="TestPass123!"):
    r = requests.post(
        f"{api}/auth/register",
        json={"email": email, "full_name": name, "password": password},
    )
    if r.status_code in (200, 201):
        return r.json()
    return None


def login(api, email, password="TestPass123!"):
    r = requests.post(
        f"{api}/auth/login",
        json={"email": email, "password": password},
    )
    if r.status_code == 200:
        return r.json()
    return None


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def main():
    parser = argparse.ArgumentParser(
        description="AgileRush manual API visibility tests"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the API server",
    )
    args = parser.parse_args()

    API = f"{args.base_url}/api"

    print()
    print("=" * 60)
    print("  AgileRush -- Organization & Visibility Manual Tests")
    print("=" * 60)
    print()

    # -- SETUP: Create Users --
    print("[Setup] Creating test users...")
    print()

    user1 = register(API, "testowner@agile-rush.com", "Test Owner")
    user2 = register(API, "testmember@agile-rush.com", "Test Member")
    user3 = register(API, "teststranger@agile-rush.com", "Test Stranger")

    if not all([user1, user2, user3]):
        user1 = user1 or login(API, "testowner@agile-rush.com")
        user2 = user2 or login(API, "testmember@agile-rush.com")
        user3 = user3 or login(API, "teststranger@agile-rush.com")

    if not all([user1, user2, user3]):
        print("[!!] Failed to create/login test users. Aborting.")
        return 1

    token1 = user1["access_token"]
    token2 = user2["access_token"]
    token3 = user3["access_token"]

    print("  Created: Test Owner, Test Member, Test Stranger")
    print()

    # -- TEST GROUP: Project Visibility --
    print("[Test Group] Project Visibility")
    print()

    r = requests.get(f"{API}/projects", headers=auth_headers(token3))
    log(
        "New user (Stranger) sees 0 projects",
        r.status_code == 200 and len(r.json()) == 0,
        f"Got {len(r.json()) if r.status_code == 200 else 'error'}",
    )

    r = requests.post(
        f"{API}/projects",
        json={"name": "Owner Personal Project"},
        headers=auth_headers(token1),
    )
    personal_project_id = r.json().get("id") if r.status_code in (200, 201) else None
    log(
        "Owner can create personal project",
        r.status_code in (200, 201) and personal_project_id is not None,
    )

    r = requests.get(f"{API}/projects", headers=auth_headers(token1))
    owner_project_ids = [p["id"] for p in r.json()]
    log("Owner sees own personal project", personal_project_id in owner_project_ids)

    r = requests.get(f"{API}/projects", headers=auth_headers(token3))
    stranger_project_ids = [p["id"] for p in r.json()]
    log(
        "Stranger CANNOT see owner's project",
        personal_project_id not in stranger_project_ids,
    )

    if personal_project_id:
        r = requests.get(
            f"{API}/projects/{personal_project_id}",
            headers=auth_headers(token3),
        )
        log(
            "Stranger gets 404 on direct project access",
            r.status_code == 404,
            f"Got {r.status_code}",
        )

    if personal_project_id:
        r = requests.get(
            f"{API}/projects/{personal_project_id}/backlog",
            headers=auth_headers(token3),
        )
        log(
            "Stranger gets 404 on backlog access",
            r.status_code == 404,
            f"Got {r.status_code}",
        )

    # -- TEST GROUP: Organizations --
    print()
    print("[Test Group] Organizations")
    print()

    r = requests.post(
        f"{API}/organizations",
        json={"name": "Test Org", "description": "For testing"},
        headers=auth_headers(token1),
    )
    org_id = r.json().get("id") if r.status_code in (200, 201) else None
    org_slug = r.json().get("slug") if r.status_code in (200, 201) else None
    log(
        "Owner can create organization",
        r.status_code in (200, 201) and org_id is not None,
        f"Slug: {org_slug}",
    )

    if org_id:
        r = requests.get(
            f"{API}/organizations/{org_id}", headers=auth_headers(token3)
        )
        log(
            "Stranger CANNOT see organization",
            r.status_code == 404,
            f"Got {r.status_code}",
        )

    if org_id:
        r = requests.post(
            f"{API}/organizations/{org_id}/members/invite",
            json={"email": "testmember@agile-rush.com", "role": "member"},
            headers=auth_headers(token1),
        )
        log(
            "Owner can invite member to org",
            r.status_code == 200,
            f"Got {r.status_code}",
        )

    if org_id:
        r = requests.post(
            f"{API}/organizations/{org_id}/members/accept",
            headers=auth_headers(token2),
        )
        log(
            "Member can accept org invitation",
            r.status_code == 200,
            f"Got {r.status_code}",
        )

    # -- Create org project --
    org_project_id = None
    if org_id:
        r = requests.post(
            f"{API}/organizations/{org_id}/projects",
            json={"name": "Org Test Project"},
            headers=auth_headers(token1),
        )
        org_project_id = r.json().get("id") if r.status_code in (200, 201) else None
        log(
            "Owner can create project in org",
            r.status_code in (200, 201) and org_project_id is not None,
        )

    if org_project_id:
        r = requests.get(f"{API}/projects", headers=auth_headers(token2))
        member_project_ids = [p["id"] for p in r.json()]
        log("Org member sees org project", org_project_id in member_project_ids)

    if org_project_id:
        r = requests.get(f"{API}/projects", headers=auth_headers(token3))
        stranger_project_ids = [p["id"] for p in r.json()]
        log(
            "Stranger CANNOT see org project",
            org_project_id not in stranger_project_ids,
        )

    if org_project_id:
        r = requests.get(
            f"{API}/projects/{org_project_id}/backlog",
            headers=auth_headers(token2),
        )
        log(
            "Org member can access org project backlog",
            r.status_code == 200,
            f"Got {r.status_code}",
        )

    if org_project_id:
        r = requests.get(
            f"{API}/projects/{org_project_id}/backlog",
            headers=auth_headers(token3),
        )
        log(
            "Stranger CANNOT access org project backlog",
            r.status_code == 404,
            f"Got {r.status_code}",
        )

    # -- TEST GROUP: Search Visibility --
    print()
    print("[Test Group] Search Visibility")
    print()

    if org_project_id:
        requests.post(
            f"{API}/projects/{org_project_id}/backlog",
            json={"title": "UniqueSearchTestItem12345"},
            headers=auth_headers(token1),
        )

        r = requests.get(
            f"{API}/search?q=UniqueSearchTestItem12345",
            headers=auth_headers(token2),
        )
        member_found = (
            r.json().get("total", 0) > 0 if r.status_code == 200 else False
        )
        log("Member can find org item via search", member_found)

        r = requests.get(
            f"{API}/search?q=UniqueSearchTestItem12345",
            headers=auth_headers(token3),
        )
        stranger_found = (
            r.json().get("total", 0) > 0 if r.status_code == 200 else False
        )
        log("Stranger CANNOT find org item via search", not stranger_found)

    # -- TEST GROUP: Access Revocation --
    print()
    print("[Test Group] Access Revocation")
    print()

    if org_id and org_project_id:
        r = requests.get(
            f"{API}/organizations/{org_id}/members",
            headers=auth_headers(token1),
        )
        if r.status_code == 200:
            members = r.json()
            member_entry = next(
                (
                    m
                    for m in members
                    if m.get("user", {}).get("email")
                    == "testmember@agile-rush.com"
                ),
                None,
            )
            if member_entry:
                r = requests.delete(
                    f"{API}/organizations/{org_id}/members/{member_entry['id']}",
                    headers=auth_headers(token1),
                )
                log(
                    "Owner can remove member from org",
                    r.status_code == 200,
                    f"Got {r.status_code}",
                )

                r = requests.get(
                    f"{API}/projects/{org_project_id}",
                    headers=auth_headers(token2),
                )
                log(
                    "Removed member CANNOT access org project",
                    r.status_code == 404,
                    f"Got {r.status_code}",
                )

    # -- SUMMARY --
    print()
    print("=" * 60)
    passed = sum(1 for _, p in results if p)
    failed = sum(1 for _, p in results if not p)
    total = len(results)
    print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
    print("=" * 60)

    if failed > 0:
        print()
        print("  Failed tests:")
        for name, p in results:
            if not p:
                print(f"     - {name}")

    print()

    # -- FRONTEND MANUAL CHECKLIST --
    print()
    print("=" * 60)
    print("  FRONTEND MANUAL TESTING CHECKLIST")
    print("=" * 60)
    print(
        """
REGISTRATION & EMPTY STATE
[ ] Register a new account (User A)
[ ] Dashboard shows 0 projects -- no other users' projects visible
[ ] "Create your first project" empty state displays
[ ] No organization sections shown

PERSONAL PROJECTS
[ ] Create a personal project
[ ] Project appears under "My Projects" section
[ ] Project card shows "Personal" badge
[ ] Can access backlog, board, sprints, reports, settings

CREATE ORGANIZATION
[ ] Click "Create Organization" in sidebar
[ ] Modal shows name field + auto-generated slug
[ ] Create org -- appears in sidebar under ORGANIZATIONS
[ ] Org appears as a section on dashboard

ORG PROJECTS
[ ] Open org page (/org/slug)
[ ] Create a project inside the org
[ ] Project appears under org section on dashboard
[ ] Project card shows user's role (Owner/Admin/Member)

INVITE MEMBER TO ORG
[ ] Open org -- Members tab
[ ] Click "Invite Member" -- enter User B's email
[ ] Toast shows success message

MEMBER ACCEPTANCE (open incognito window)
[ ] Register as User B with the invited email
[ ] User B sees invitation notification
[ ] Accept invitation -- org appears in sidebar
[ ] User B can see org projects on dashboard
[ ] User B can access org project backlog, board, etc.

STRANGER ISOLATION (open another incognito window)
[ ] Register as User C (not invited anywhere)
[ ] Dashboard shows 0 projects
[ ] User C cannot see User A's personal projects
[ ] User C cannot see org projects
[ ] Navigating to a known project URL returns 404 or redirect

PROJECT CREATION -- ORG SELECTOR
[ ] Click "New Project" -- see org selector (Personal / OrgName)
[ ] Creating under org -- project appears in org section
[ ] Creating as personal -- appears under "My Projects"

MOVE PROJECT
[ ] Go to project settings -- "Project Location" section
[ ] Move personal project to org -- confirms access change
[ ] Org members can now see the moved project
[ ] Move org project to personal -- confirms access revocation

SEARCH VISIBILITY
[ ] User A creates items in org project
[ ] User B (org member) can find items via Cmd+K search
[ ] User C (stranger) CANNOT find those items via search

MEMBER REMOVAL
[ ] User A removes User B from org
[ ] User B's dashboard no longer shows org section
[ ] User B cannot access org projects (gets 404)

SIDEBAR NAVIGATION
[ ] Inside a project: sidebar shows org name (or "Personal") above project name
[ ] Clicking org name -- goes to org page
[ ] Org page has Projects, Members, Settings tabs

ROLE PERMISSIONS
[ ] Org Member cannot create org projects (button hidden or disabled)
[ ] Org Member cannot access org settings
[ ] Org Admin CAN create projects and invite members
[ ] Org Owner CAN delete org and transfer ownership
[ ] Project Viewer cannot edit backlog items (buttons disabled)

EDGE CASES
[ ] User in 2+ orgs sees both org sections on dashboard
[ ] User with 0 orgs sees only "My Projects" section
[ ] Invite non-existent email -- register with that email -- invitation auto-links
[ ] Delete org -- projects transferred or deleted (per user choice)
"""
    )

    return 1 if failed > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
