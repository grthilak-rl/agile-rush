"""
HTML email templates for AgileRush notifications.
Each function returns (subject, html_body).
"""

import os

APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _base_template(content: str, project_name: str = "") -> str:
    footer_text = ""
    if project_name:
        footer_text = f"You're receiving this because you're a member of {project_name} on AgileRush."
    else:
        footer_text = "You're receiving this because you have an account on AgileRush."
    return f"""
<div style="max-width:600px; margin:0 auto; font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="background:linear-gradient(135deg,#2563EB,#8B5CF6); padding:20px 24px; border-radius:12px 12px 0 0;">
    <span style="color:white; font-size:20px; font-weight:800; letter-spacing:-0.5px;">AgileRush</span>
  </div>
  <div style="background:white; padding:32px 24px; border:1px solid #E2E8F0; border-top:none;">
    {content}
  </div>
  <div style="padding:16px 24px; text-align:center; font-size:12px; color:#94A3B8;">
    {footer_text}
    <br><a href="{APP_URL}/settings/profile" style="color:#2563EB; text-decoration:none;">Manage notification preferences</a>
  </div>
</div>
"""


def _cta_button(text: str, url: str) -> str:
    return f"""
<div style="text-align:center; margin:24px 0;">
  <a href="{url}" style="display:inline-block; background:#2563EB; color:white; padding:12px 32px;
     border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">{text}</a>
</div>
"""


def email_item_assigned(assigner_name: str, item_title: str, project_name: str, item_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] You've been assigned: {item_title}"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">New Assignment</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
      <strong>{assigner_name}</strong> assigned you to:
    </p>
    <p style="color:#0F172A; font-size:16px; font-weight:600; margin:0 0 4px 0;">{item_title}</p>
    <p style="color:#64748B; font-size:13px; margin:0;">in {project_name}</p>
    {_cta_button("View Item", item_url)}
    """
    return subject, _base_template(content, project_name)


def email_mentioned(author_name: str, item_title: str, comment_preview: str, item_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] {author_name} mentioned you on {item_title}"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">You were mentioned</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 16px 0;">
      <strong>{author_name}</strong> mentioned you in a comment on <strong>{item_title}</strong>:
    </p>
    <div style="background:#F8FAFC; border-left:3px solid #2563EB; padding:12px 16px; border-radius:0 8px 8px 0; margin:0 0 16px 0;">
      <p style="color:#334155; font-size:14px; line-height:1.5; margin:0;">{comment_preview}</p>
    </div>
    {_cta_button("View Comment", item_url)}
    """
    return subject, _base_template(content)


def email_sprint_started(sprint_name: str, project_name: str, goal: str, item_count: int, board_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] {sprint_name} has started"
    goal_html = f'<p style="color:#334155; font-size:14px; margin:8px 0;">Goal: {goal}</p>' if goal else ""
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">Sprint Started</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
      <strong>{sprint_name}</strong> has kicked off in <strong>{project_name}</strong>.
    </p>
    {goal_html}
    <p style="color:#64748B; font-size:13px; margin:8px 0;">{item_count} items in this sprint</p>
    {_cta_button("Go to Board", board_url)}
    """
    return subject, _base_template(content, project_name)


def email_sprint_ending(sprint_name: str, project_name: str, days_left: int, board_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] {sprint_name} ends in {days_left} days"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">Sprint Ending Soon</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0;">
      <strong>{sprint_name}</strong> in <strong>{project_name}</strong> ends in <strong>{days_left} days</strong>.
    </p>
    {_cta_button("View Board", board_url)}
    """
    return subject, _base_template(content, project_name)


def email_sprint_completed(sprint_name: str, project_name: str, completion_rate: int, summary_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] {sprint_name} completed - {completion_rate}%"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">Sprint Completed</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
      <strong>{sprint_name}</strong> in <strong>{project_name}</strong> has been completed.
    </p>
    <p style="color:#10B981; font-size:24px; font-weight:700; margin:16px 0;">{completion_rate}% completed</p>
    {_cta_button("View Summary", summary_url)}
    """
    return subject, _base_template(content, project_name)


def email_invitation(inviter_name: str, project_name: str, role: str, accept_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] {inviter_name} invited you to {project_name}"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:20px;">Project Invitation</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
      <strong>{inviter_name}</strong> has invited you to join <strong>{project_name}</strong> as a <strong>{role}</strong>.
    </p>
    {_cta_button("Accept Invitation", accept_url)}
    """
    return subject, _base_template(content, project_name)


def email_overdue(item_title: str, project_name: str, due_date: str, item_url: str) -> tuple[str, str]:
    subject = f"[AgileRush] Overdue: {item_title}"
    content = f"""
    <h2 style="margin:0 0 16px 0; color:#EF4444; font-size:20px;">Item Overdue</h2>
    <p style="color:#334155; font-size:15px; line-height:1.6; margin:0 0 8px 0;">
      <strong>{item_title}</strong> in <strong>{project_name}</strong> was due on <strong>{due_date}</strong> and is still not complete.
    </p>
    {_cta_button("View Item", item_url)}
    """
    return subject, _base_template(content, project_name)


NOTIFICATION_PREF_MAP = {
    "item_assigned": "item_assigned",
    "mentioned": "mentioned",
    "comment_added": "comments",
    "sprint_started": "sprint_events",
    "sprint_ending_soon": "sprint_events",
    "sprint_completed": "sprint_events",
    "due_soon": "due_dates",
    "overdue": "due_dates",
    "invitation": "invitations",
}
