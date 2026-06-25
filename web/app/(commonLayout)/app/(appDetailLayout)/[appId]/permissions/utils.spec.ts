import { describe, expect, it } from 'vitest'
import {
  getAppIdFromPathname,
  getEditInheritedUseMemberIds,
  normalizePermissionDraftForEditAccess,
} from './utils'

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
