from collections.abc import Iterable

import sqlalchemy as sa
from sqlalchemy import delete, select
from werkzeug.exceptions import Forbidden

from extensions.ext_database import db
from models import Account, App, TenantAccountJoin
from models.account import TenantAccountRole
from models.app_permission import (
    AppEditPermissionScope,
    AppPermissionMember,
    AppPermissionSetting,
    AppPermissionType,
    AppUsePermissionScope,
)


class AppPermissionService:
    """Centralizes app-level edit/use permission checks.

    The compatibility default is intentionally permissive for existing Dify
    1.13.3 apps: workspace editors can still edit, and existing Web App URLs
    remain publicly usable until a maintainer tightens the app permission.
    """

    @classmethod
    def get_permission_setting(cls, app: App) -> AppPermissionSetting:
        setting = db.session.scalar(
            select(AppPermissionSetting).where(AppPermissionSetting.app_id == app.id).limit(1)
        )
        if setting:
            return setting

        return AppPermissionSetting(
            tenant_id=app.tenant_id,
            app_id=app.id,
            edit_scope=AppEditPermissionScope.ALL_EDITORS,
            use_scope=AppUsePermissionScope.PUBLIC,
        )

    @classmethod
    def ensure_permission_setting(cls, app: App) -> AppPermissionSetting:
        setting = db.session.scalar(
            select(AppPermissionSetting).where(AppPermissionSetting.app_id == app.id).limit(1)
        )
        if setting:
            return setting

        setting = AppPermissionSetting(
            tenant_id=app.tenant_id,
            app_id=app.id,
            edit_scope=AppEditPermissionScope.ALL_EDITORS,
            use_scope=AppUsePermissionScope.PUBLIC,
        )
        db.session.add(setting)
        db.session.flush()
        return setting

    @classmethod
    def has_member_permission(cls, app: App, account_id: str, permission_type: AppPermissionType) -> bool:
        return (
            db.session.scalar(
                select(AppPermissionMember.id)
                .where(
                    AppPermissionMember.app_id == app.id,
                    AppPermissionMember.permission_type == permission_type,
                    AppPermissionMember.account_id == account_id,
                )
                .limit(1)
            )
            is not None
        )

    @classmethod
    def can_edit_app(cls, account: Account | None, app: App) -> bool:
        if account is None or not getattr(account, "has_edit_permission", False):
            return False

        setting = cls.get_permission_setting(app)
        if setting.edit_scope == AppEditPermissionScope.ALL_EDITORS:
            return True
        if setting.edit_scope == AppEditPermissionScope.ONLY_CREATOR:
            return account.id == app.created_by
        if setting.edit_scope == AppEditPermissionScope.SELECTED_EDITORS:
            return cls.has_member_permission(app, account.id, AppPermissionType.EDIT)
        return False

    @classmethod
    def can_use_app(cls, account: Account | None, app: App) -> bool:
        setting = cls.get_permission_setting(app)
        if setting.use_scope == AppUsePermissionScope.PUBLIC:
            return True
        if account is None:
            return False
        if cls.can_edit_app(account, app):
            return True
        if setting.use_scope == AppUsePermissionScope.ALL_MEMBERS:
            return cls._is_same_tenant(account, app)
        if setting.use_scope == AppUsePermissionScope.ONLY_CREATOR:
            return account.id == app.created_by
        if setting.use_scope == AppUsePermissionScope.SELECTED_MEMBERS:
            return cls.has_member_permission(app, account.id, AppPermissionType.USE)
        return False

    @classmethod
    def can_manage_app_permission(cls, account: Account | None, app: App) -> bool:
        if account is None:
            return False
        return account.id == app.created_by or bool(getattr(account, "is_admin_or_owner", False))

    @classmethod
    def is_public_app(cls, app: App) -> bool:
        return cls.get_permission_setting(app).use_scope == AppUsePermissionScope.PUBLIC

    @classmethod
    def get_member_ids(cls, app: App, permission_type: AppPermissionType) -> list[str]:
        return list(
            db.session.scalars(
                select(AppPermissionMember.account_id)
                .where(
                    AppPermissionMember.app_id == app.id,
                    AppPermissionMember.permission_type == permission_type,
                )
                .order_by(AppPermissionMember.created_at.asc())
            ).all()
        )

    @classmethod
    def count_member_ids(cls, app: App, permission_type: AppPermissionType) -> int:
        return len(cls.get_member_ids(app, permission_type))

    @classmethod
    def update_permissions(
        cls,
        app: App,
        account: Account,
        edit_scope: AppEditPermissionScope,
        edit_member_ids: Iterable[str],
        use_scope: AppUsePermissionScope,
        use_member_ids: Iterable[str],
    ) -> AppPermissionSetting:
        if not cls.can_manage_app_permission(account, app):
            raise Forbidden("You do not have permission to manage this app permission.")

        normalized_edit_member_ids, normalized_use_scope, normalized_use_member_ids = cls._normalize_use_permission(
            app=app,
            edit_scope=edit_scope,
            edit_member_ids=edit_member_ids,
            use_scope=use_scope,
            use_member_ids=use_member_ids,
        )

        setting = cls.ensure_permission_setting(app)
        setting.edit_scope = edit_scope
        setting.use_scope = normalized_use_scope
        setting.updated_by = account.id

        cls._replace_members(app, AppPermissionType.EDIT, normalized_edit_member_ids)
        cls._replace_members(app, AppPermissionType.USE, normalized_use_member_ids)
        db.session.commit()
        return setting

    @classmethod
    def attach_permission_summary(cls, app: App) -> None:
        setting = cls.get_permission_setting(app)
        app.edit_scope = setting.edit_scope.value
        app.use_scope = setting.use_scope.value
        app.edit_member_count = cls.count_member_ids(app, AppPermissionType.EDIT)
        app.use_member_count = cls.count_member_ids(app, AppPermissionType.USE)
        app.edit_permission_scope = setting.edit_scope.value
        app.use_permission_scope = setting.use_scope.value
        app.edit_permission_member_count = app.edit_member_count
        app.use_permission_member_count = app.use_member_count

    @classmethod
    def build_edit_permission_filter(cls, account: Account) -> sa.ColumnElement[bool]:
        """Return the SQL condition that limits Studio apps to editable apps."""
        if not getattr(account, "has_edit_permission", False):
            return sa.false()

        setting_exists = sa.exists().where(AppPermissionSetting.app_id == App.id)
        edit_scope = (
            select(AppPermissionSetting.edit_scope)
            .where(AppPermissionSetting.app_id == App.id)
            .limit(1)
            .scalar_subquery()
        )
        selected_editor_exists = sa.exists().where(
            AppPermissionMember.app_id == App.id,
            AppPermissionMember.permission_type == AppPermissionType.EDIT,
            AppPermissionMember.account_id == account.id,
        )

        return sa.or_(
            sa.not_(setting_exists),
            edit_scope == AppEditPermissionScope.ALL_EDITORS.value,
            sa.and_(edit_scope == AppEditPermissionScope.ONLY_CREATOR.value, App.created_by == account.id),
            sa.and_(edit_scope == AppEditPermissionScope.SELECTED_EDITORS.value, selected_editor_exists),
        )

    @classmethod
    def _replace_members(cls, app: App, permission_type: AppPermissionType, account_ids: Iterable[str]) -> None:
        db.session.execute(
            delete(AppPermissionMember).where(
                AppPermissionMember.app_id == app.id,
                AppPermissionMember.permission_type == permission_type,
            )
        )
        seen: set[str] = set()
        for account_id in account_ids:
            if not account_id or account_id in seen:
                continue
            seen.add(account_id)
            db.session.add(
                AppPermissionMember(
                    tenant_id=app.tenant_id,
                    app_id=app.id,
                    permission_type=permission_type,
                    account_id=account_id,
                )
            )

    @classmethod
    def _normalize_use_permission(
        cls,
        app: App,
        edit_scope: AppEditPermissionScope,
        edit_member_ids: Iterable[str],
        use_scope: AppUsePermissionScope,
        use_member_ids: Iterable[str],
    ) -> tuple[list[str], AppUsePermissionScope, list[str]]:
        normalized_edit_member_ids = cls._unique_member_ids(edit_member_ids)
        normalized_use_member_ids = cls._unique_member_ids(use_member_ids)
        inherited_use_member_ids = cls._get_edit_inherited_use_member_ids(
            app=app,
            edit_scope=edit_scope,
            edit_member_ids=normalized_edit_member_ids,
        )

        if use_scope == AppUsePermissionScope.SELECTED_MEMBERS:
            return (
                normalized_edit_member_ids,
                use_scope,
                cls._unique_member_ids([*normalized_use_member_ids, *inherited_use_member_ids]),
            )

        if use_scope == AppUsePermissionScope.ONLY_CREATOR and any(
            account_id != app.created_by for account_id in inherited_use_member_ids
        ):
            return (
                normalized_edit_member_ids,
                AppUsePermissionScope.SELECTED_MEMBERS,
                cls._unique_member_ids([app.created_by, *normalized_use_member_ids, *inherited_use_member_ids]),
            )

        return normalized_edit_member_ids, use_scope, normalized_use_member_ids

    @classmethod
    def _get_edit_inherited_use_member_ids(
        cls,
        app: App,
        edit_scope: AppEditPermissionScope,
        edit_member_ids: Iterable[str],
    ) -> list[str]:
        if edit_scope == AppEditPermissionScope.ONLY_CREATOR:
            return [app.created_by]
        if edit_scope == AppEditPermissionScope.SELECTED_EDITORS:
            return cls._unique_member_ids(edit_member_ids)
        if edit_scope == AppEditPermissionScope.ALL_EDITORS:
            return list(
                db.session.scalars(
                    select(TenantAccountJoin.account_id)
                    .where(
                        TenantAccountJoin.tenant_id == app.tenant_id,
                        TenantAccountJoin.role.in_(
                            [
                                TenantAccountRole.OWNER.value,
                                TenantAccountRole.ADMIN.value,
                                TenantAccountRole.EDITOR.value,
                            ]
                        ),
                    )
                    .order_by(TenantAccountJoin.created_at.asc())
                ).all()
            )
        return []

    @staticmethod
    def _unique_member_ids(account_ids: Iterable[str]) -> list[str]:
        seen: set[str] = set()
        unique_ids: list[str] = []
        for account_id in account_ids:
            if not account_id or account_id in seen:
                continue
            seen.add(account_id)
            unique_ids.append(account_id)
        return unique_ids

    @staticmethod
    def _is_same_tenant(account: Account, app: App) -> bool:
        current_tenant_id = getattr(account, "current_tenant_id", None)
        if current_tenant_id is not None:
            return current_tenant_id == app.tenant_id

        return (
            db.session.scalar(
                select(TenantAccountJoin.id)
                .where(TenantAccountJoin.tenant_id == app.tenant_id, TenantAccountJoin.account_id == account.id)
                .limit(1)
            )
            is not None
        )


def require_app_edit_permission(account: Account, app: App) -> None:
    if not AppPermissionService.can_edit_app(account, app):
        raise Forbidden("You do not have permission to edit this app.")


def require_app_manage_permission(account: Account, app: App) -> None:
    if not AppPermissionService.can_manage_app_permission(account, app):
        raise Forbidden("You do not have permission to manage this app.")


def can_assign_edit_permission(account: Account) -> bool:
    return TenantAccountRole.is_editing_role(account.role)
