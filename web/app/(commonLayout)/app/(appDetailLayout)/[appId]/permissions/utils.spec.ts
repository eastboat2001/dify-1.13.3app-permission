import type { Member } from '@/models/common'
import { describe, expect, it } from 'vitest'
import {
  addPermissionMembers,
  clearSelectablePermissionMembers,
  filterPermissionMembers,
  getAppIdFromPathname,
  getEditInheritedUseMemberIds,
  getPermissionMemberSummary,
  isUseOnlyCreatorScopeBlocked,
  normalizePermissionDraftForEditAccess,
} from './utils'

const createMember = (
  id: string,
  role: Member['role'],
  name: string,
  email = `${id}@test.local`,
): Member => ({
  id,
  name,
  email,
  avatar: '',
  avatar_url: '',
  created_at: '2026-06-25T00:00:00Z',
  last_active_at: '2026-06-25T00:00:00Z',
  last_login_at: '2026-06-25T00:00:00Z',
  role,
  status: 'active',
})

describe('getAppIdFromPathname', () => {
  it('returns app id from app detail permission route', () => {
    expect(getAppIdFromPathname('/app/0c876c51-6846-4c55-a85d-7485fbabbfdd/permissions')).toBe(
      '0c876c51-6846-4c55-a85d-7485fbabbfdd',
    )
  })

  it('returns undefined when pathname does not include app id', () => {
    expect(getAppIdFromPathname('/apps')).toBeUndefined()
  })
})

describe('getEditInheritedUseMemberIds', () => {
  it('returns selected editors when edit scope is selected editors', () => {
    expect(getEditInheritedUseMemberIds({
      edit_scope: 'selected_editors',
      edit_members: ['editor1', 'admin1'],
      use_scope: 'selected_members',
      use_members: ['member1'],
    }, ['owner1', 'editor1'], 'creator')).toEqual(['editor1', 'admin1'])
  })

  it('returns all editable members when edit scope is all editors', () => {
    expect(getEditInheritedUseMemberIds({
      edit_scope: 'all_editors',
      edit_members: [],
      use_scope: 'selected_members',
      use_members: [],
    }, ['owner1', 'admin1', 'editor1'], 'creator')).toEqual(['owner1', 'admin1', 'editor1'])
  })

  it('returns creator when edit scope is only creator', () => {
    expect(getEditInheritedUseMemberIds({
      edit_scope: 'only_creator',
      edit_members: [],
      use_scope: 'selected_members',
      use_members: [],
    }, [], 'creator')).toEqual(['creator'])
  })
})

describe('normalizePermissionDraftForEditAccess', () => {
  it('adds inherited editors to selected use members', () => {
    expect(normalizePermissionDraftForEditAccess({
      edit_scope: 'selected_editors',
      edit_members: ['editor1', 'admin1'],
      use_scope: 'selected_members',
      use_members: ['member1', 'editor1'],
    }, ['editor1', 'admin1'], 'creator')).toEqual({
      edit_scope: 'selected_editors',
      edit_members: ['editor1', 'admin1'],
      use_scope: 'selected_members',
      use_members: ['member1', 'editor1', 'admin1'],
    })
  })

  it('changes only creator use scope to selected members when another editor inherits use', () => {
    expect(normalizePermissionDraftForEditAccess({
      edit_scope: 'selected_editors',
      edit_members: ['editor1'],
      use_scope: 'only_creator',
      use_members: [],
    }, ['editor1'], 'creator')).toEqual({
      edit_scope: 'selected_editors',
      edit_members: ['editor1'],
      use_scope: 'selected_members',
      use_members: ['creator', 'editor1'],
    })
  })
})

describe('isUseOnlyCreatorScopeBlocked', () => {
  it('blocks only creator use scope when edit access grants use to another member', () => {
    expect(isUseOnlyCreatorScopeBlocked(['creator', 'editor1'], 'creator')).toBe(true)
  })

  it('allows only creator use scope when inherited use access only contains the creator', () => {
    expect(isUseOnlyCreatorScopeBlocked(['creator'], 'creator')).toBe(false)
  })
})

describe('filterPermissionMembers', () => {
  const members = [
    createMember('owner1', 'owner', 'Eastboat', 'eastboat@example.com'),
    createMember('admin1', 'admin', 'Admin One', 'admin1@test.local'),
    createMember('editor1', 'editor', 'Editor One', 'editor1@test.local'),
    createMember('member1', 'normal', 'Member One', 'member1@test.local'),
  ]

  it('filters members by search text, role, and selected state', () => {
    expect(filterPermissionMembers(members, {
      searchValue: 'one',
      roleFilter: 'editor',
      onlySelected: true,
      selectedIds: ['editor1', 'member1'],
    })).toEqual([members[2]])
  })

  it('matches member email when search text does not match the name', () => {
    expect(filterPermissionMembers(members, {
      searchValue: 'admin1@test',
      roleFilter: 'all',
      onlySelected: false,
      selectedIds: [],
    })).toEqual([members[1]])
  })
})

describe('permission member batch helpers', () => {
  it('adds filtered members without duplicating existing selections', () => {
    expect(addPermissionMembers(['owner1', 'editor1'], ['editor1', 'admin1'])).toEqual(['owner1', 'editor1', 'admin1'])
  })

  it('keeps locked members when clearing selectable members', () => {
    expect(clearSelectablePermissionMembers(['owner1', 'editor1', 'member1'], ['editor1'])).toEqual(['editor1'])
  })
})

describe('getPermissionMemberSummary', () => {
  it('returns selected members in selection order with overflow count', () => {
    const members = [
      createMember('owner1', 'owner', 'Eastboat'),
      createMember('editor1', 'editor', 'Editor One'),
      createMember('admin1', 'admin', 'Admin One'),
      createMember('member1', 'normal', 'Member One'),
    ]

    expect(getPermissionMemberSummary(members, ['member1', 'owner1', 'admin1', 'editor1'], 2)).toEqual({
      selectedCount: 4,
      visibleMembers: [members[3], members[0]],
      overflowCount: 2,
    })
  })
})
