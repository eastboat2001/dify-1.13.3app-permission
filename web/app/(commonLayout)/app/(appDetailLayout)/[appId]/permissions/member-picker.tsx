'use client'

import type { PermissionMemberRoleFilter } from './utils'
import type { Member } from '@/models/common'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/app/components/base/button'
import SearchInput from '@/app/components/base/search-input'
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/app/components/base/ui/dialog'
import { cn } from '@/utils/classnames'
import {
  addPermissionMembers,
  clearSelectablePermissionMembers,
  filterPermissionMembers,
  getPermissionMemberSummary,
} from './utils'

const roleOrder: Member['role'][] = ['owner', 'admin', 'editor', 'normal', 'dataset_operator']

type MemberPermissionPickerProps = {
  title: string
  emptyText: string
  members: Member[]
  selectedIds: string[]
  lockedIds?: string[]
  lockedLabel?: string
  disabled?: boolean
  getRoleLabel: (role: Member['role']) => string
  onChange: (ids: string[]) => void
}

const MemberPermissionPicker = ({
  title,
  emptyText,
  members,
  selectedIds,
  lockedIds = [],
  lockedLabel,
  disabled,
  getRoleLabel,
  onChange,
}: MemberPermissionPickerProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [roleFilter, setRoleFilter] = useState<PermissionMemberRoleFilter>('all')
  const [onlySelected, setOnlySelected] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds)

  const lockedSet = useMemo(() => new Set(lockedIds), [lockedIds])
  const tempSelectedSet = useMemo(() => new Set(tempSelectedIds), [tempSelectedIds])
  const summary = useMemo(() => {
    return getPermissionMemberSummary(members, selectedIds, 3)
  }, [members, selectedIds])
  const availableRoles = useMemo(() => {
    return roleOrder.filter(role => members.some(member => member.role === role))
  }, [members])
  const filteredMembers = useMemo(() => {
    return filterPermissionMembers(members, {
      searchValue,
      roleFilter,
      onlySelected,
      selectedIds: tempSelectedIds,
    })
  }, [members, onlySelected, roleFilter, searchValue, tempSelectedIds])

  const openPicker = useCallback(() => {
    setTempSelectedIds(selectedIds)
    setSearchValue('')
    setRoleFilter('all')
    setOnlySelected(false)
    setIsOpen(true)
  }, [selectedIds])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open)
      setIsOpen(false)
  }, [])

  const confirmSelection = useCallback(() => {
    onChange(tempSelectedIds)
    setIsOpen(false)
  }, [onChange, tempSelectedIds])

  const toggleMember = useCallback((memberId: string) => {
    if (disabled || lockedSet.has(memberId))
      return

    setTempSelectedIds((prev) => {
      if (prev.includes(memberId))
        return prev.filter(id => id !== memberId)

      return [...prev, memberId]
    })
  }, [disabled, lockedSet])

  const selectFilteredMembers = useCallback(() => {
    if (disabled)
      return

    setTempSelectedIds(prev => addPermissionMembers(prev, filteredMembers.map(member => member.id)))
  }, [disabled, filteredMembers])

  const clearSelectableMembers = useCallback(() => {
    if (disabled)
      return

    setTempSelectedIds(prev => clearSelectablePermissionMembers(prev, lockedIds))
  }, [disabled, lockedIds])

  const summaryNames = summary.visibleMembers.map(member => member.name || member.email).join(', ')
  const canOpenPicker = members.length > 0

  return (
    <>
      <div className="rounded-lg border border-components-panel-border bg-background-section-burn p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase text-text-tertiary">{title}</div>
            <div className="mt-1 text-sm font-medium text-text-secondary">
              {summary.selectedCount > 0
                ? t('permission.memberPicker.selectedCount', { ns: 'app', count: summary.selectedCount })
                : emptyText}
            </div>
            {summary.selectedCount > 0 && (
              <div className="mt-1 truncate text-xs text-text-tertiary">
                {summaryNames}
                {summary.overflowCount > 0 && (
                  <span>{t('permission.memberPicker.selectedOverflow', { ns: 'app', count: summary.overflowCount })}</span>
                )}
              </div>
            )}
          </div>
          <Button
            size="small"
            disabled={!canOpenPicker}
            onClick={openPicker}
          >
            {disabled ? t('permission.memberPicker.view', { ns: 'app' }) : t('permission.memberPicker.manage', { ns: 'app' })}
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[720px] p-0">
          <DialogCloseButton onClick={closeModal} />
          <div className="border-b border-divider-subtle px-6 py-5 pr-14">
            <DialogTitle className="text-lg font-semibold text-text-primary">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-text-tertiary">
              {t('permission.memberPicker.description', { ns: 'app' })}
            </DialogDescription>
          </div>

          <div className="flex flex-col gap-3 px-6 py-4">
            <SearchInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder={t('permission.memberPicker.searchPlaceholder', { ns: 'app' }) || ''}
              className="w-full"
            />

            <div className="flex flex-wrap items-center gap-2">
              {[{ value: 'all' as const, label: t('permission.memberPicker.role.all', { ns: 'app' }) }, ...availableRoles.map(role => ({
                value: role,
                label: getRoleLabel(role),
              }))].map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium text-text-tertiary hover:bg-state-base-hover hover:text-text-secondary',
                    roleFilter === option.value && 'bg-state-accent-hover text-text-accent',
                  )}
                  onClick={() => setRoleFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="small"
                disabled={disabled || filteredMembers.length === 0}
                onClick={selectFilteredMembers}
              >
                {t('permission.memberPicker.selectVisible', { ns: 'app' })}
              </Button>
              <Button
                size="small"
                disabled={disabled || tempSelectedIds.every(memberId => lockedSet.has(memberId))}
                onClick={clearSelectableMembers}
              >
                {t('permission.memberPicker.clearSelectable', { ns: 'app' })}
              </Button>
              <Button
                size="small"
                variant={onlySelected ? 'secondary-accent' : 'secondary'}
                onClick={() => setOnlySelected(value => !value)}
              >
                {t('permission.memberPicker.onlySelected', { ns: 'app' })}
              </Button>
              <div className="ml-auto text-xs text-text-tertiary">
                {t('permission.memberPicker.filteredCount', { ns: 'app', count: filteredMembers.length })}
              </div>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto border-y border-divider-subtle px-6 py-2">
            {filteredMembers.length === 0 && (
              <div className="px-2 py-10 text-center text-sm text-text-tertiary">
                {t('permission.memberPicker.noFilteredMembers', { ns: 'app' })}
              </div>
            )}
            {filteredMembers.map((member) => {
              const isSelected = tempSelectedSet.has(member.id)
              const isLocked = lockedSet.has(member.id)

              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={disabled || isLocked}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-state-base-hover',
                    (disabled || isLocked) && 'cursor-not-allowed opacity-60',
                  )}
                  onClick={() => toggleMember(member.id)}
                >
                  <input
                    type="checkbox"
                    readOnly
                    checked={isSelected}
                    className="size-4 shrink-0 rounded border-components-checkbox-border"
                  />
                  <span className="min-w-0 grow">
                    <span className="block truncate text-sm font-medium text-text-secondary">{member.name || member.email}</span>
                    <span className="block truncate text-xs text-text-tertiary">{member.email}</span>
                  </span>
                  <span className="shrink-0 rounded bg-components-badge-bg-dimm px-2 py-0.5 text-xs text-text-tertiary">
                    {isLocked && lockedLabel ? lockedLabel : getRoleLabel(member.role)}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <div className="text-sm text-text-tertiary">
              {t('permission.memberPicker.selectedCount', { ns: 'app', count: tempSelectedIds.length })}
            </div>
            <div className="flex items-center gap-2">
              {disabled
                ? (
                    <Button variant="primary" onClick={closeModal}>
                      {t('permission.memberPicker.close', { ns: 'app' })}
                    </Button>
                  )
                : (
                    <>
                      <Button onClick={closeModal}>{t('operation.cancel', { ns: 'common' })}</Button>
                      <Button variant="primary" onClick={confirmSelection}>{t('operation.confirm', { ns: 'common' })}</Button>
                    </>
                  )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MemberPermissionPicker
