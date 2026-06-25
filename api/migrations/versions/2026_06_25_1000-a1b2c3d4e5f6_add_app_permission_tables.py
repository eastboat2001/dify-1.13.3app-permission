"""add app permission tables

Revision ID: a1b2c3d4e5f6
Revises: 6b5f9f8b1a2c
Create Date: 2026-06-25 10:00:00.000000

"""

from uuid import uuid4

import sqlalchemy as sa
from alembic import op

import models.types

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "6b5f9f8b1a2c"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "app_permission_settings",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("app_id", models.types.StringUUID(), nullable=False),
        sa.Column("edit_scope", sa.String(length=32), server_default=sa.text("'all_editors'"), nullable=False),
        sa.Column("use_scope", sa.String(length=32), server_default=sa.text("'public'"), nullable=False),
        sa.Column("updated_by", models.types.StringUUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="app_permission_setting_pkey"),
        sa.UniqueConstraint("app_id", name="app_permission_setting_app_id_unique"),
    )
    op.create_index("app_permission_setting_tenant_id_idx", "app_permission_settings", ["tenant_id"])

    op.create_table(
        "app_permission_members",
        sa.Column("id", models.types.StringUUID(), nullable=False),
        sa.Column("tenant_id", models.types.StringUUID(), nullable=False),
        sa.Column("app_id", models.types.StringUUID(), nullable=False),
        sa.Column("permission_type", sa.String(length=16), nullable=False),
        sa.Column("account_id", models.types.StringUUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="app_permission_member_pkey"),
        sa.UniqueConstraint(
            "app_id", "permission_type", "account_id", name="app_permission_member_app_type_account_unique"
        ),
    )
    op.create_index("app_permission_member_tenant_id_idx", "app_permission_members", ["tenant_id"])
    op.create_index("app_permission_member_app_id_idx", "app_permission_members", ["app_id"])
    op.create_index("app_permission_member_account_id_idx", "app_permission_members", ["account_id"])

    conn = op.get_bind()
    existing_apps = conn.execute(sa.text("select id, tenant_id from apps")).mappings().all()
    if existing_apps:
        permission_table = sa.table(
            "app_permission_settings",
            sa.column("id", sa.String()),
            sa.column("tenant_id", sa.String()),
            sa.column("app_id", sa.String()),
            sa.column("edit_scope", sa.String()),
            sa.column("use_scope", sa.String()),
        )
        op.bulk_insert(
            permission_table,
            [
                {
                    "id": str(uuid4()),
                    "tenant_id": app["tenant_id"],
                    "app_id": app["id"],
                    "edit_scope": "all_editors",
                    "use_scope": "public",
                }
                for app in existing_apps
            ],
        )


def downgrade():
    op.drop_index("app_permission_member_account_id_idx", table_name="app_permission_members")
    op.drop_index("app_permission_member_app_id_idx", table_name="app_permission_members")
    op.drop_index("app_permission_member_tenant_id_idx", table_name="app_permission_members")
    op.drop_table("app_permission_members")

    op.drop_index("app_permission_setting_tenant_id_idx", table_name="app_permission_settings")
    op.drop_table("app_permission_settings")
