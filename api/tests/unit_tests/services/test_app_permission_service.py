from types import SimpleNamespace

from models import TenantAccountRole
from models.app_permission import AppEditPermissionScope, AppPermissionType, AppUsePermissionScope
from services.app_permission_service import AppPermissionService


def _account(account_id: str, role: TenantAccountRole):
    return SimpleNamespace(
        id=account_id,
        role=role,
        has_edit_permission=TenantAccountRole.is_editing_role(role),
        is_admin_or_owner=TenantAccountRole.is_privileged_role(role),
    )


def _app(created_by: str = "creator"):
    return SimpleNamespace(id="app-1", tenant_id="tenant-1", created_by=created_by)


def _setting(
    edit_scope: AppEditPermissionScope = AppEditPermissionScope.ALL_EDITORS,
    use_scope: AppUsePermissionScope = AppUsePermissionScope.PUBLIC,
):
    return SimpleNamespace(edit_scope=edit_scope, use_scope=use_scope)


def _patch_setting(monkeypatch, setting, members: set[tuple[AppPermissionType, str]] | None = None):
    members = members or set()
    monkeypatch.setattr(
        AppPermissionService,
        "get_permission_setting",
        classmethod(lambda cls, app: setting),
    )
    monkeypatch.setattr(
        AppPermissionService,
        "has_member_permission",
        classmethod(lambda cls, app, account_id, permission_type: (permission_type, account_id) in members),
    )


def test_default_permissions_keep_existing_editors_and_public_webapp_access(monkeypatch):
    _patch_setting(monkeypatch, _setting())

    assert AppPermissionService.can_edit_app(_account("editor", TenantAccountRole.EDITOR), _app())
    assert not AppPermissionService.can_edit_app(_account("member", TenantAccountRole.NORMAL), _app())
    assert AppPermissionService.can_use_app(None, _app())


def test_selected_editor_scope_does_not_elevate_workspace_member(monkeypatch):
    _patch_setting(
        monkeypatch,
        _setting(edit_scope=AppEditPermissionScope.SELECTED_EDITORS),
        {(AppPermissionType.EDIT, "member"), (AppPermissionType.EDIT, "editor")},
    )

    assert not AppPermissionService.can_edit_app(_account("member", TenantAccountRole.NORMAL), _app())
    assert AppPermissionService.can_edit_app(_account("editor", TenantAccountRole.EDITOR), _app())


def test_selected_use_scope_allows_listed_members_without_edit_permission(monkeypatch):
    _patch_setting(
        monkeypatch,
        _setting(use_scope=AppUsePermissionScope.SELECTED_MEMBERS),
        {(AppPermissionType.USE, "member")},
    )

    assert AppPermissionService.can_use_app(_account("member", TenantAccountRole.NORMAL), _app())
    assert not AppPermissionService.can_use_app(_account("other", TenantAccountRole.NORMAL), _app())


def test_manage_permission_is_limited_to_creator_and_workspace_admins(monkeypatch):
    _patch_setting(monkeypatch, _setting())
    app = _app(created_by="creator")

    assert AppPermissionService.can_manage_app_permission(_account("creator", TenantAccountRole.EDITOR), app)
    assert AppPermissionService.can_manage_app_permission(_account("admin", TenantAccountRole.ADMIN), app)
    assert not AppPermissionService.can_manage_app_permission(_account("editor", TenantAccountRole.EDITOR), app)


def test_update_permissions_adds_selected_editors_to_selected_use_members(monkeypatch):
    app = _app(created_by="creator")
    setting = _setting()
    replaced_members: dict[AppPermissionType, list[str]] = {}

    monkeypatch.setattr(
        AppPermissionService,
        "can_manage_app_permission",
        classmethod(lambda cls, account, app: True),
    )
    monkeypatch.setattr(
        AppPermissionService,
        "ensure_permission_setting",
        classmethod(lambda cls, app: setting),
    )
    monkeypatch.setattr(
        AppPermissionService,
        "_replace_members",
        classmethod(lambda cls, app, permission_type, account_ids: replaced_members.update({permission_type: list(account_ids)})),
    )
    monkeypatch.setattr("services.app_permission_service.db.session.commit", lambda: None)

    AppPermissionService.update_permissions(
        app=app,
        account=_account("creator", TenantAccountRole.OWNER),
        edit_scope=AppEditPermissionScope.SELECTED_EDITORS,
        edit_member_ids=["editor1", "admin1"],
        use_scope=AppUsePermissionScope.SELECTED_MEMBERS,
        use_member_ids=["member1", "editor1"],
    )

    assert replaced_members[AppPermissionType.EDIT] == ["editor1", "admin1"]
    assert replaced_members[AppPermissionType.USE] == ["member1", "editor1", "admin1"]


def test_update_permissions_broadens_only_creator_use_when_selected_editors_need_use(monkeypatch):
    app = _app(created_by="creator")
    setting = _setting()
    replaced_members: dict[AppPermissionType, list[str]] = {}

    monkeypatch.setattr(
        AppPermissionService,
        "can_manage_app_permission",
        classmethod(lambda cls, account, app: True),
    )
    monkeypatch.setattr(
        AppPermissionService,
        "ensure_permission_setting",
        classmethod(lambda cls, app: setting),
    )
    monkeypatch.setattr(
        AppPermissionService,
        "_replace_members",
        classmethod(lambda cls, app, permission_type, account_ids: replaced_members.update({permission_type: list(account_ids)})),
    )
    monkeypatch.setattr("services.app_permission_service.db.session.commit", lambda: None)

    AppPermissionService.update_permissions(
        app=app,
        account=_account("creator", TenantAccountRole.OWNER),
        edit_scope=AppEditPermissionScope.SELECTED_EDITORS,
        edit_member_ids=["editor1"],
        use_scope=AppUsePermissionScope.ONLY_CREATOR,
        use_member_ids=[],
    )

    assert setting.use_scope == AppUsePermissionScope.SELECTED_MEMBERS
    assert replaced_members[AppPermissionType.USE] == ["creator", "editor1"]
