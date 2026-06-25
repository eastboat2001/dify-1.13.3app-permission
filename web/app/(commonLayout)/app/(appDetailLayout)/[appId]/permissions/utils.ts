import type { Member } from '@/models/common'
import type { AppPermissionSettings } from '@/types/app'

export type PermissionDraft = Omit<AppPermissionSettings, 'can_manage' | 'creator_id'>
export type PermissionMemberRoleFilter = Member['role'] | 'all'

export type PermissionMemberFilter = {
  searchValue: string
  roleFilter: PermissionMemberRoleFilter
  onlySelected: boolean
  selectedIds: string[]
}

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

export const filterPermissionMembers = (
  members: Member[],
  filter: PermissionMemberFilter,
) => {
  const selectedSet = new Set(filter.selectedIds)
  const normalizedSearchValue = filter.searchValue.trim().toLowerCase()

  return members.filter((member) => {
    if (filter.onlySelected && !selectedSet.has(member.id))
      return false

    if (filter.roleFilter !== 'all' && member.role !== filter.roleFilter)
      return false

    if (!normalizedSearchValue)
      return true

    const searchableText = `${member.name || ''} ${member.email || ''}`.toLowerCase()
    return searchableText.includes(normalizedSearchValue)
  })
}

export const addPermissionMembers = (
  selectedIds: string[],
  memberIdsToAdd: string[],
) => {
  return uniqueMemberIds(selectedIds, memberIdsToAdd)
}

export const clearSelectablePermissionMembers = (
  selectedIds: string[],
  lockedIds: string[] = [],
) => {
  const lockedSet = new Set(lockedIds)
  return selectedIds.filter(memberId => lockedSet.has(memberId))
}

export const getPermissionMemberSummary = (
  members: Member[],
  selectedIds: string[],
  visibleCount = 3,
) => {
  const memberById = new Map(members.map(member => [member.id, member]))
  const selectedMembers = selectedIds
    .map(memberId => memberById.get(memberId))
    .filter((member): member is Member => !!member)

  return {
    selectedCount: selectedMembers.length,
    visibleMembers: selectedMembers.slice(0, visibleCount),
    overflowCount: Math.max(selectedMembers.length - visibleCount, 0),
  }
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

export const isUseOnlyCreatorScopeBlocked = (
  inheritedUseMemberIds: string[],
  creatorId?: string,
) => {
  return inheritedUseMemberIds.some(memberId => memberId !== creatorId)
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

  if (!isUseOnlyCreatorScopeBlocked(inheritedUseMemberIds, creatorId))
    return permission

  return {
    ...permission,
    use_scope: 'selected_members',
    use_members: uniqueMemberIds(creatorId ? [creatorId] : [], permission.use_members, inheritedUseMemberIds),
  }
}
