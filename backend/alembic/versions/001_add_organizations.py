"""add organizations tables and org_id to projects

Revision ID: 001_add_orgs
Revises:
Create Date: 2026-03-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "001_add_orgs"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    return table_name in insp.get_table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = inspect(bind)
    columns = [c["name"] for c in insp.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Create organizations table
    if not table_exists("organizations"):
        op.create_table(
            "organizations",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("slug", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("logo_url", sa.String(), nullable=True),
            sa.Column("plan", sa.String(), nullable=False, server_default="free"),
            sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    # Create org_members table
    if not table_exists("org_members"):
        op.create_table(
            "org_members",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("org_id", sa.String(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("role", sa.String(), nullable=False, server_default="member"),
            sa.Column("status", sa.String(), nullable=False, server_default="pending"),
            sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("org_id", "user_id", name="uq_org_member"),
        )

    # Add org_id column to projects table
    if table_exists("projects") and not column_exists("projects", "org_id"):
        op.add_column(
            "projects",
            sa.Column(
                "org_id",
                sa.String(),
                sa.ForeignKey("organizations.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    # Remove org_id from projects
    if table_exists("projects") and column_exists("projects", "org_id"):
        op.drop_column("projects", "org_id")

    # Drop org_members
    if table_exists("org_members"):
        op.drop_table("org_members")

    # Drop organizations
    if table_exists("organizations"):
        op.drop_index("ix_organizations_slug", table_name="organizations")
        op.drop_table("organizations")
