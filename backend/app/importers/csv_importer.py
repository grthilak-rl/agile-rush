"""
Generic CSV importer.
Auto-detects column mappings and parses any CSV into the normalized import format.
"""

import csv
import io
from datetime import datetime

from app.core.importer import BaseImporter


class CSVImporter(BaseImporter):

    COLUMN_MAP = {
        "title": ["title", "summary", "name", "task", "item", "card"],
        "type": ["type", "issue type", "issue_type", "category", "kind"],
        "priority": ["priority", "severity", "urgency"],
        "status": ["status", "state", "stage", "column", "list"],
        "story_points": ["story points", "story_points", "points", "estimate", "effort", "sp"],
        "due_date": ["due date", "due_date", "deadline", "due", "target date"],
        "labels": ["labels", "tags", "categories"],
        "description": ["description", "desc", "details", "body", "notes"],
        "assignee": ["assignee", "assigned to", "assigned_to", "owner", "responsible"],
    }

    STATUS_MAP = {
        "to do": "todo",
        "todo": "todo",
        "to-do": "todo",
        "backlog": "backlog",
        "doing": "in_progress",
        "in progress": "in_progress",
        "in-progress": "in_progress",
        "in_progress": "in_progress",
        "review": "in_review",
        "in review": "in_review",
        "in-review": "in_review",
        "in_review": "in_review",
        "testing": "in_review",
        "qa": "in_review",
        "done": "done",
        "complete": "done",
        "completed": "done",
    }

    TYPE_MAP = {
        "story": "story",
        "user story": "story",
        "feature": "story",
        "task": "task",
        "sub-task": "task",
        "bug": "bug",
        "defect": "bug",
    }

    PRIORITY_MAP = {
        "critical": "critical",
        "highest": "critical",
        "blocker": "critical",
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
        """Parse generic CSV into normalized format."""
        reader = csv.DictReader(io.StringIO(csv_text))

        if not reader.fieldnames:
            return {"source": "csv", "items": [], "lists": []}

        # Auto-detect column mapping
        headers = {h.lower().strip(): h for h in reader.fieldnames}
        column_mapping = self._detect_columns(headers)

        items = []
        for row in reader:
            title = self._get_field(row, column_mapping, "title")
            if not title:
                continue  # skip rows without title

            items.append({
                "title": title,
                "description": self._get_field(row, column_mapping, "description") or "",
                "type": self._map_type(self._get_field(row, column_mapping, "type")),
                "priority": self._map_priority(self._get_field(row, column_mapping, "priority")),
                "status": self._map_status(self._get_field(row, column_mapping, "status")),
                "story_points": self._parse_int(self._get_field(row, column_mapping, "story_points")),
                "labels": self._parse_labels(self._get_field(row, column_mapping, "labels")),
                "due_date": self._parse_date(self._get_field(row, column_mapping, "due_date")),
                "assignee_email": self._get_field(row, column_mapping, "assignee"),
                "acceptance_criteria": [],
                "comments": [],
                "original_id": "",
                "source_list": self._get_field(row, column_mapping, "status") or "",
            })

        return {
            "source": "csv",
            "items": items,
            "lists": [],
        }

    def _detect_columns(self, headers: dict) -> dict:
        """Auto-detect which CSV columns map to which fields."""
        mapping = {}
        for field, variations in self.COLUMN_MAP.items():
            for variation in variations:
                if variation in headers:
                    mapping[field] = headers[variation]  # original case header name
                    break
        return mapping

    def _get_field(self, row: dict, mapping: dict, field: str) -> str | None:
        header = mapping.get(field)
        if header and row.get(header):
            return row[header].strip()
        return None

    def _map_type(self, value: str | None) -> str:
        if not value:
            return "task"
        return self.TYPE_MAP.get(value.lower().strip(), "task")

    def _map_priority(self, value: str | None) -> str:
        if not value:
            return "medium"
        return self.PRIORITY_MAP.get(value.lower().strip(), "medium")

    def _map_status(self, value: str | None) -> str:
        if not value:
            return "backlog"
        return self.STATUS_MAP.get(value.lower().strip(), "backlog")

    def _parse_int(self, value: str | None) -> int | None:
        if not value:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def _parse_labels(self, value: str | None) -> list:
        if not value:
            return []
        return [lbl.strip() for lbl in value.split(",") if lbl.strip()]

    def _parse_date(self, value: str | None) -> str | None:
        if not value:
            return None
        for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y-%m-%dT%H:%M:%S"]:
            try:
                return datetime.strptime(value.strip()[:19], fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None
