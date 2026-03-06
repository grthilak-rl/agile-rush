"""
Import and Export API endpoints.
POST /api/projects/:id/import/preview - Preview import
POST /api/projects/:id/import - Execute import
GET  /api/projects/:id/import/template - Download CSV template
GET  /api/projects/:id/export/csv - Export as CSV
GET  /api/projects/:id/export/json - Export as JSON
GET  /api/projects/:id/export/pdf - Export sprint summary as PDF
"""

import csv
import io
import json
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.project_access import get_project_with_access
from app.core.importer import import_items_to_project
from app.importers.trello import TrelloImporter
from app.importers.jira import JiraImporter
from app.importers.csv_importer import CSVImporter
from app.models.user import User
from app.models.project import Project
from app.models.backlog_item import BacklogItem, ItemStatus
from app.models.sprint import Sprint, SprintStatus
from app.models.comment import Comment

router = APIRouter(prefix="/api/projects", tags=["import-export"])

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _get_importer(source: str):
    """Return the appropriate importer for the source type."""
    importers = {
        "trello": TrelloImporter(),
        "jira": JiraImporter(),
        "csv": CSVImporter(),
    }
    importer = importers.get(source)
    if not importer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid source type: {source}. Must be 'trello', 'jira', or 'csv'.",
        )
    return importer


async def _read_and_parse(file: UploadFile, source: str) -> dict:
    """Read upload file and parse into normalized format."""
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds 5MB limit.",
        )

    if not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty.",
        )

    importer = _get_importer(source)

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not decode file. Please use UTF-8 encoding.",
            )

    if source == "trello":
        try:
            json_data = json.loads(text)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON file. Please export your Trello board as JSON.",
            )
        if "cards" not in json_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Trello export. File must contain a 'cards' key.",
            )
        parsed = importer.parse(json_data)
    else:
        # CSV-based (jira or generic csv)
        # Validate it's parseable CSV with at least a title/summary column
        try:
            reader = csv.DictReader(io.StringIO(text))
            fieldnames = reader.fieldnames
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid CSV file.",
            )

        if not fieldnames:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file has no columns.",
            )

        # Check for a title-like column
        lower_fields = [f.lower().strip() for f in fieldnames]
        title_cols = ["title", "summary", "name", "task", "item", "card"]
        has_title = any(col in lower_fields for col in title_cols)
        if not has_title:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not detect a title column. Expected one of: Title, Summary, Name.",
            )

        parsed = importer.parse(text)

    return parsed


@router.post("/{project_id}/import/preview")
async def preview_import(
    project_id: str,
    file: UploadFile = File(...),
    source: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview what would be imported without writing to database."""
    get_project_with_access(project_id, current_user, db, "admin")

    parsed = await _read_and_parse(file, source)

    items = parsed.get("items", [])

    # Build status mapping summary
    status_counts: dict[str, int] = {}
    for item in items:
        source_list = item.get("source_list") or item.get("status", "backlog")
        mapped_status = item.get("status", "backlog")
        key = f"{source_list}"
        if key not in status_counts:
            status_counts[key] = {"mapped_to": mapped_status, "count": 0}
        status_counts[key]["count"] += 1

    status_mapping = {
        k: f"{v['mapped_to']} ({v['count']} items)"
        for k, v in status_counts.items()
    }

    # Collect warnings
    warnings = []
    has_points = any(item.get("story_points") is not None for item in items)
    if not has_points and items:
        warnings.append("No story points found - all items will have no points assigned")

    if source == "trello":
        warnings.append("Trello has no priority field - all items will default to medium priority")

    # Detect unmapped statuses
    valid_statuses = {"backlog", "todo", "in_progress", "in_review", "done"}
    unmapped = [
        k for k, v in status_counts.items()
        if v["mapped_to"] not in valid_statuses
    ]

    # Items preview (first 10)
    items_preview = [
        {
            "title": item["title"],
            "type": item.get("type", "task"),
            "status": item.get("status", "backlog"),
            "priority": item.get("priority", "medium"),
            "story_points": item.get("story_points"),
            "labels": item.get("labels", []),
            "due_date": item.get("due_date"),
        }
        for item in items[:10]
    ]

    return {
        "source": source,
        "total_items": len(items),
        "items_preview": items_preview,
        "status_mapping": status_mapping,
        "unmapped_statuses": unmapped,
        "warnings": warnings,
    }


@router.post("/{project_id}/import")
async def execute_import(
    project_id: str,
    file: UploadFile = File(...),
    source: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import items from file into the project."""
    get_project_with_access(project_id, current_user, db, "admin")

    parsed = await _read_and_parse(file, source)

    if not parsed.get("items"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No items found in the file to import.",
        )

    result = import_items_to_project(parsed, project_id, current_user.id, db)
    return result.to_dict()


@router.get("/{project_id}/import/template")
def download_csv_template(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a CSV template file for importing."""
    get_project_with_access(project_id, current_user, db, "viewer")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Type", "Priority", "Status", "Story Points", "Due Date", "Labels", "Description"])
    writer.writerow([
        "Example task 1", "story", "high", "todo", "5", "2026-02-15",
        "frontend,auth", "Implement the login page",
    ])
    writer.writerow([
        "Example bug fix", "bug", "critical", "in_progress", "3", "2026-02-10",
        "bugfix", "Fix the redirect loop issue",
    ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agilerush-import-template.csv"},
    )


# --- Export Endpoints ---


@router.get("/{project_id}/export/csv")
def export_csv(
    project_id: str,
    sprint_id: Optional[str] = Query(None),
    item_status: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export project backlog items as CSV."""
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")

    query = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee), joinedload(BacklogItem.sprint))
        .filter(BacklogItem.project_id == project_id)
    )

    if sprint_id:
        query = query.filter(BacklogItem.sprint_id == sprint_id)
    if item_status:
        query = query.filter(BacklogItem.status == item_status)

    items = query.order_by(BacklogItem.position).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Title", "Type", "Priority", "Status", "Story Points",
        "Assignee", "Due Date", "Labels", "Sprint", "Description",
        "Created", "Updated",
    ])

    for item in items:
        writer.writerow([
            item.title,
            item.type,
            item.priority,
            item.status,
            item.story_points if item.story_points is not None else "",
            item.assignee.full_name if item.assignee else "",
            str(item.due_date) if item.due_date else "",
            ",".join(item.labels) if item.labels else "",
            item.sprint.name if item.sprint else "",
            item.description or "",
            str(item.created_at) if item.created_at else "",
            str(item.updated_at) if item.updated_at else "",
        ])

    safe_name = "".join(c if c.isalnum() or c in "-_ " else "" for c in project.name).strip().replace(" ", "-")
    filename = f"agilerush-{safe_name}-export.csv"

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{project_id}/export/json")
def export_json(
    project_id: str,
    sprint_id: Optional[str] = Query(None),
    include_comments: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export project data as JSON."""
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")

    query = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee), joinedload(BacklogItem.sprint))
        .filter(BacklogItem.project_id == project_id)
    )

    if sprint_id:
        query = query.filter(BacklogItem.sprint_id == sprint_id)

    items = query.order_by(BacklogItem.position).all()

    sprints = (
        db.query(Sprint)
        .filter(Sprint.project_id == project_id)
        .order_by(Sprint.sprint_number)
        .all()
    )

    items_data = []
    for item in items:
        item_dict = {
            "title": item.title,
            "description": item.description,
            "type": item.type,
            "priority": item.priority,
            "status": item.status,
            "story_points": item.story_points,
            "labels": item.labels or [],
            "due_date": str(item.due_date) if item.due_date else None,
            "start_date": str(item.start_date) if item.start_date else None,
            "assignee": item.assignee.full_name if item.assignee else None,
            "sprint": item.sprint.name if item.sprint else None,
            "acceptance_criteria": item.acceptance_criteria or [],
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        }

        if include_comments:
            comments = (
                db.query(Comment)
                .filter(Comment.backlog_item_id == item.id)
                .order_by(Comment.created_at)
                .all()
            )
            item_dict["comments"] = [
                {
                    "content": c.content,
                    "author_id": c.author_id,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
                for c in comments
            ]

        items_data.append(item_dict)

    sprints_data = [
        {
            "name": s.name,
            "sprint_number": s.sprint_number,
            "goal": s.goal,
            "status": s.status,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None,
            "duration_weeks": s.duration_weeks,
        }
        for s in sprints
    ]

    export_data = {
        "project": {
            "name": project.name,
            "description": project.description,
            "project_type": project.project_type,
            "exported_at": date.today().isoformat(),
        },
        "items": items_data,
        "sprints": sprints_data,
        "total_items": len(items_data),
    }

    safe_name = "".join(c if c.isalnum() or c in "-_ " else "" for c in project.name).strip().replace(" ", "-")
    filename = f"agilerush-{safe_name}-export.json"

    json_str = json.dumps(export_data, indent=2, ensure_ascii=False)

    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{project_id}/export/pdf")
def export_pdf(
    project_id: str,
    sprint_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export sprint summary as PDF."""
    project, _ = get_project_with_access(project_id, current_user, db, "viewer")

    sprint = (
        db.query(Sprint)
        .filter(Sprint.id == sprint_id, Sprint.project_id == project_id)
        .first()
    )
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sprint not found",
        )

    items = (
        db.query(BacklogItem)
        .options(joinedload(BacklogItem.assignee))
        .filter(BacklogItem.sprint_id == sprint.id)
        .order_by(BacklogItem.position)
        .all()
    )

    total_points = sum(i.story_points or 0 for i in items)
    completed_items = [i for i in items if i.status == ItemStatus.done]
    completed_points = sum(i.story_points or 0 for i in completed_items)
    incomplete_items = [i for i in items if i.status != ItemStatus.done]
    completion_rate = round((completed_points / total_points * 100) if total_points > 0 else 0)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF generation library (reportlab) is not installed.",
        )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=6,
    )
    elements.append(Paragraph(f"{project.name}", title_style))
    elements.append(Paragraph(f"Sprint Summary: {sprint.name}", styles["Heading2"]))

    if sprint.start_date and sprint.end_date:
        elements.append(Paragraph(
            f"Date Range: {sprint.start_date} to {sprint.end_date}",
            styles["Normal"],
        ))

    elements.append(Spacer(1, 18))

    # Stats section
    stats_data = [
        ["Metric", "Value"],
        ["Total Items", str(len(items))],
        ["Completed Items", str(len(completed_items))],
        ["Incomplete Items", str(len(incomplete_items))],
        ["Planned Points", str(total_points)],
        ["Completed Points", str(completed_points)],
        ["Completion Rate", f"{completion_rate}%"],
    ]

    stats_table = Table(stats_data, colWidths=[2.5 * inch, 2.5 * inch])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 24))

    # Completed items
    if completed_items:
        elements.append(Paragraph("Completed Items", styles["Heading3"]))
        elements.append(Spacer(1, 6))

        completed_data = [["Title", "Type", "Priority", "Points", "Assignee"]]
        for item in completed_items:
            completed_data.append([
                Paragraph(item.title[:60], styles["Normal"]),
                item.type,
                item.priority,
                str(item.story_points or "-"),
                item.assignee.full_name if item.assignee else "-",
            ])

        completed_table = Table(
            completed_data,
            colWidths=[2.5 * inch, 0.8 * inch, 0.8 * inch, 0.6 * inch, 1.5 * inch],
        )
        completed_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0FDF4")]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(completed_table)
        elements.append(Spacer(1, 18))

    # Incomplete items
    if incomplete_items:
        elements.append(Paragraph("Incomplete Items", styles["Heading3"]))
        elements.append(Spacer(1, 6))

        incomplete_data = [["Title", "Type", "Priority", "Status", "Points"]]
        for item in incomplete_items:
            status_display = item.status.replace("_", " ").title()
            incomplete_data.append([
                Paragraph(item.title[:60], styles["Normal"]),
                item.type,
                item.priority,
                status_display,
                str(item.story_points or "-"),
            ])

        incomplete_table = Table(
            incomplete_data,
            colWidths=[2.5 * inch, 0.8 * inch, 0.8 * inch, 1.0 * inch, 0.6 * inch],
        )
        incomplete_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FFFBEB")]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(incomplete_table)

    # Footer
    elements.append(Spacer(1, 24))
    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#94A3B8"),
    )
    elements.append(Paragraph(
        f"Generated by AgileRush on {date.today().isoformat()}",
        footer_style,
    ))

    doc.build(elements)
    buffer.seek(0)

    safe_sprint = "".join(c if c.isalnum() or c in "-_ " else "" for c in sprint.name).strip().replace(" ", "-")
    filename = f"{safe_sprint}-summary.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
