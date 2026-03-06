"""
Trello JSON importer.
Parses Trello board JSON export into the normalized import format.
"""

from app.core.importer import BaseImporter


class TrelloImporter(BaseImporter):

    STATUS_MAP = {
        "to do": "todo",
        "todo": "todo",
        "to-do": "todo",
        "backlog": "backlog",
        "doing": "in_progress",
        "in progress": "in_progress",
        "in-progress": "in_progress",
        "review": "in_review",
        "in review": "in_review",
        "in-review": "in_review",
        "testing": "in_review",
        "qa": "in_review",
        "done": "done",
        "complete": "done",
        "completed": "done",
        "archived": "done",
    }

    LABEL_COLOR_TO_TYPE = {
        "red": "bug",
        "blue": "story",
        "purple": "task",
    }

    def parse(self, json_data: dict) -> dict:
        """Parse Trello JSON export into normalized format."""

        # Build list ID -> name mapping
        list_map = {lst["id"]: lst["name"] for lst in json_data.get("lists", [])}

        # Build member ID -> info mapping
        member_map = {m["id"]: m for m in json_data.get("members", [])}

        # Build checklist ID -> items mapping
        checklist_map = {}
        for cl in json_data.get("checklists", []):
            checklist_map[cl["id"]] = cl.get("checkItems", [])

        items = []
        for card in json_data.get("cards", []):
            if card.get("closed", False):
                continue  # skip archived cards

            list_name = list_map.get(card.get("idList", ""), "Backlog")
            status = self._map_status(list_name)

            # Extract labels
            labels = [lbl["name"] for lbl in card.get("labels", []) if lbl.get("name")]

            # Detect type from label colors
            item_type = "task"  # default
            for label in card.get("labels", []):
                mapped = self.LABEL_COLOR_TO_TYPE.get(label.get("color"))
                if mapped:
                    item_type = mapped
                    break

            # Extract checklists as acceptance criteria
            acceptance_criteria = []
            for cl_id in card.get("idChecklists", []):
                for check_item in checklist_map.get(cl_id, []):
                    acceptance_criteria.append({
                        "text": check_item["name"],
                        "checked": check_item.get("state") == "complete",
                    })

            # Extract due date
            due_date = None
            if card.get("due"):
                due_date = card["due"][:10]  # YYYY-MM-DD

            # Extract assignee (first member)
            assignee_email = None
            if card.get("idMembers"):
                member = member_map.get(card["idMembers"][0])
                if member:
                    assignee_email = member.get("username")

            items.append({
                "title": card.get("name", ""),
                "description": card.get("desc", ""),
                "type": item_type,
                "priority": "medium",  # Trello has no priority concept
                "status": status,
                "story_points": None,  # Trello has no story points
                "labels": labels,
                "due_date": due_date,
                "assignee_email": assignee_email,
                "acceptance_criteria": acceptance_criteria,
                "comments": [],
                "original_id": card.get("id", ""),
                "source_list": list_name,
            })

        lists = [
            {"name": lst["name"], "position": lst.get("pos", 0)}
            for lst in json_data.get("lists", [])
        ]

        return {
            "source": "trello",
            "items": items,
            "lists": lists,
        }

    def _map_status(self, list_name: str) -> str:
        return self.STATUS_MAP.get(list_name.lower().strip(), "backlog")
