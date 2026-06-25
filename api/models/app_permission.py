import enum
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa
from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import TypeBase
from .types import EnumText, StringUUID


class AppEditPermissionScope(enum.StrEnum):
    ONLY_CREATOR = "only_creator"
    SELECTED_EDITORS = "selected_editors"
    ALL_EDITORS = "all_editors"


class AppUsePermissionScope(enum.StrEnum):
    ONLY_CREATOR = "only_creator"
    SELECTED_MEMBERS = "selected_members"
    ALL_MEMBERS = "all_members"
    PUBLIC = "public"


class AppPermissionType(enum.StrEnum):
    EDIT = "edit"
    USE = "use"


class AppPermissionSetting(TypeBase):
    """Stores the coarse edit/use scopes for one app.

    Missing rows are treated by AppPermissionService as the compatibility
    default: all workspace editors can edit and the Web App URL stays public.
    """

    __tablename__ = "app_permission_settings"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="app_permission_setting_pkey"),
        sa.UniqueConstraint("app_id", name="app_permission_setting_app_id_unique"),
        sa.Index("app_permission_setting_tenant_id_idx", "tenant_id"),
    )

    id: Mapped[str] = mapped_column(
        StringUUID,
        insert_default=lambda: str(uuid4()),
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        init=False,
    )
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    app_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    edit_scope: Mapped[AppEditPermissionScope] = mapped_column(
        EnumText(AppEditPermissionScope, length=32),
        nullable=False,
        server_default=sa.text("'all_editors'"),
        default=AppEditPermissionScope.ALL_EDITORS,
    )
    use_scope: Mapped[AppUsePermissionScope] = mapped_column(
        EnumText(AppUsePermissionScope, length=32),
        nullable=False,
        server_default=sa.text("'public'"),
        default=AppUsePermissionScope.PUBLIC,
    )
    updated_by: Mapped[str | None] = mapped_column(StringUUID, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), init=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp(), init=False
    )


class AppPermissionMember(TypeBase):
    """Stores selected-member overrides for app edit or use permissions."""

    __tablename__ = "app_permission_members"
    __table_args__ = (
        sa.PrimaryKeyConstraint("id", name="app_permission_member_pkey"),
        sa.UniqueConstraint(
            "app_id", "permission_type", "account_id", name="app_permission_member_app_type_account_unique"
        ),
        sa.Index("app_permission_member_tenant_id_idx", "tenant_id"),
        sa.Index("app_permission_member_app_id_idx", "app_id"),
        sa.Index("app_permission_member_account_id_idx", "account_id"),
    )

    id: Mapped[str] = mapped_column(
        StringUUID,
        insert_default=lambda: str(uuid4()),
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        init=False,
    )
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    app_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    permission_type: Mapped[AppPermissionType] = mapped_column(
        EnumText(AppPermissionType, length=16), nullable=False
    )
    account_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.current_timestamp(), init=False
    )
