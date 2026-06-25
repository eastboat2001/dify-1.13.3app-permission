import type { AppPermissionSettings } from '@/types/app'

export type PermissionDraft = Omit<AppPermissionSettings, 'can_manage' | 'creator_id'>

export const getAppIdFromPathname = (pathname: string | null | undefined) => {
  if (!pathname)
    return undefined

  const segments = pathname.split('/').filter(Boolean)
  const appSegmentIndex = segments.indexOf('app')
  if (appSegmentIndex === -1)
    return undefined

  return segments[appSegmentIndex + 1]
}

export const uniqueMemberIds = (...memberIdGroups: Array<string[] | undefined>) => {
  const memberIds: string[] = []
  const seen = new Set<string>()

  memberIdGroups.flat().forEach((memberId) => {
    if (!memberId || seen.has(memberId))
      return

    memberIds.push(memberId)
    seen.add(memberId)
  })

  return memberIds
}

export const getEditInheritedUseMemberIds = (
  permission: PermissionDraft,
  editableMemberIds: string[],
  creatorId?: string,
) => {
  if (permission.edit_scope === 'only_creator')
    return creatorId ? [creatorId] : []

  if (permission.edit_scope === 'selected_editors')
    return uniqueMemberIds(permission.edit_members)

  return uniqueMemberIds(editableMemberIds)
}

export const normalizePermissionDraftForEditAccess = (
  permission: PermissionDraft,
  inheritedUseMemberIds: string[],
  creatorId?: string,
): PermissionDraft => {
  if (permission.use_scope === 'public' || permission.use_scope === 'all_members')
    return permission

  if (permission.use_scope === 'selected_members') {
    return {
      ...permission,
      use_members: uniqueMemberIds(permission.use_members, inheritedUseMemberIds),
    }
  }

  const hasNonCreatorInheritedUseMember = inheritedUseMemberIds.some(memberId => memberId !== creatorId)
  if (!hasNonCreatorInheritedUseMember)
    return permission

  return {
    ...permission,
    use_scope: 'selected_members',
    use_members: uniqueMemberIds(creatorId ? [creatorId] : [], permission.use_members, inheritedUseMemberIds),
  }
}
