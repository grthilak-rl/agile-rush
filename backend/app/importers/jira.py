"""
Jira CSV importer.
Parses Jira CSV export into the normalized import format.
"""

import csv
import io
from datetime import datetime

from app.core.importer import BaseImporter


class JiraImporter(BaseImporter):

    STATUS_MAP = {
        "to do": "todo",
        "open": "todo",
        "new": "todo",
        "reopened": "todo",
        "in progress": "in_progress",
        "in development": "in_progress",
        "in review": "in_review",
        "code review": "in_review",
        "testing": "in_review",
        "qa": "in_review",
        "done": "done",
        "closed": "done",
        "resolved": "done",
        "backlog": "backlog",
    }

    TYPE_MAP = {
        "story": "story",
        "user story": "story",
        "feature": "story",
        "task": "task",
        "sub-task": "task",
        "subtask": "task",
        "bug": "bug",
        "defect": "bug",
        "epic": "story",
    }

    PRIORITY_MAP = {
        "highest": "critical",
        "blocker": "critical",
        "critical": "critical",
        "high": "high",
        "major": "high",
        "medium": "medium",
        "normal": "medium",
        "low": "low",
        "minor": "low",
        "lowest": "low",
        "trivial": "low",
    }

    def parse(self, csv_text: str) -> dict:
        """Parse Jira CSV export into normalized format."""
        reader = csv.DictReader(io.StringIO(csv_text))

        items = []
        for row in reader:
            title = (
                row.get("Summary")
                or row.get("summary")
                or row.get("Title")
                or row.get("title")
                or "Untitled"
            )

            issue_type = (
                row.get("Issue Type") or row.get("Issue type")
                or row.get("Type") or row.get("type") or "task"
            ).lower().strip()

            status = (
                row.get("Status") or row.get("status") or "backlog"
            ).lower().strip()

            priority = (
                row.get("Priority") or row.get("priority") or "medium"
            ).lower().strip()

            description = row.get("Description") or row.get("description") or ""

            # Story points - try multiple column names
            story_points = None
            for col in ["Story Points", "Story points", "story_points",
                        "Estimate", "Story point estimate"]:
                val = row.get(col)
                if val:
                    try:
                        story_points = int(float(val))
                    except (ValueError, TypeError):
                        pass
                    break

            # Due date
            due_date = None
            for col in ["Due Date", "Due date", "due_date", "Duedate"]:
                val = row.get(col)
                if val:
                    due_date = self._parse_jira_date(val)
                    break

            # Labels
            labels_str = row.get("Labels") or row.get("labels") or ""
            labels = [lbl.strip() for lbl in labels_str.split(",") if lbl.strip()]

            # Assignee
            assignee = row.get("Assignee") or row.get("assignee") or None
            if assignee:
                assignee = assignee.strip()

            items.append({
                "title": title.strip(),
                "description": description,
                "type": self.TYPE_MAP.get(issue_type, "task"),
                "priority": self.PRIORITY_MAP.get(priority, "medium"),
                "status": self.STATUS_MAP.get(status, "backlog"),
                "story_points": story_points,
                "labels": labels,
                "due_date": due_date,
                "assignee_email": assignee,
                "acceptance_criteria": [],
                "comments": [],
                "original_id": (row.get("Issue key") or row.get("Key") or "").strip(),
                "source_list": row.get("Status") or "",
            })

        return {
            "source": "jira",
            "items": items,
            "lists": [],
        }

    def _parse_jira_date(self, date_str: str) -> str | None:
        """Parse various Jira date formats to YYYY-MM-DD."""
        for fmt in [
            "%d/%b/%y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y",
            "%Y-%m-%dT%H:%M:%S", "%d/%b/%Y",
        ]:
            try:
                return datetime.strptime(date_str.strip()[:19], fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None
