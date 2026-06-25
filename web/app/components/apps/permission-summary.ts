import type { TFunction } from 'i18next'
import type { App, AppEditPermissionScope, AppUsePermissionScope } from '@/types/app'

const DEFAULT_EDIT_SCOPE: AppEditPermissionScope = 'all_editors'
const DEFAULT_USE_SCOPE: AppUsePermissionScope = 'public'

export const getEditPermissionScopeLabel = (
  scope: AppEditPermissionScope | undefined,
  memberCount: number | undefined,
  t: TFunction,
) => {
  if (scope === 'only_creator')
    return t('permission.tooltip.onlyCreator', { ns: 'app' })
  if (scope === 'selected_editors')
    return t('permission.tooltip.selectedEditors', { ns: 'app', count: memberCount ?? 0 })
  return t('permission.tooltip.allEditors', { ns: 'app' })
}

export const getUsePermissionScopeLabel = (
  scope: AppUsePermissionScope | undefined,
  memberCount: number | undefined,
  t: TFunction,
) => {
  if (scope === 'only_creator')
    return t('permission.tooltip.onlyCreator', { ns: 'app' })
  if (scope === 'selected_members')
    return t('permission.tooltip.selectedMembers', { ns: 'app', count: memberCount ?? 0 })
  if (scope === 'all_members')
    return t('permission.tooltip.allMembers', { ns: 'app' })
  return t('permission.tooltip.public', { ns: 'app' })
}

export const getAppPermissionSummary = (app: App, t: TFunction) => {
  const editLabel = getEditPermissionScopeLabel(app.edit_scope ?? DEFAULT_EDIT_SCOPE, app.edit_member_count, t)
  const useLabel = getUsePermissionScopeLabel(app.use_scope ?? DEFAULT_USE_SCOPE, app.use_member_count, t)

  return t('permission.tooltip.summary', {
    ns: 'app',
    edit: editLabel,
    use: useLabel,
  })
}
