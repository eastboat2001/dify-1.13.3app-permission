'use client'

import type { ComponentType } from 'react'
import type { PermissionDraft } from './utils'
import type { Member } from '@/models/common'
import type { AppEditPermissionScope, AppPermissionUpdatePayload, AppUsePermissionScope } from '@/types/app'
import { RiGlobalLine, RiLock2Line, RiTeamLine, RiUserLine } from '@remixicon/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Loading from '@/app/components/base/loading'
import Radio from '@/app/components/base/radio/ui'
import { toast } from '@/app/components/base/ui/toast'
import { usePathname } from '@/next/navigation'
import { fetchAppPermissions, updateAppPermissions } from '@/service/apps'
import { useMembers } from '@/service/use-common'
import { cn } from '@/utils/classnames'
import MemberPermissionPicker from './member-picker'
import {
  getAppIdFromPathname,
  getEditInheritedUseMemberIds,
  isUseOnlyCreatorScopeBlocked,
  normalizePermissionDraftForEditAccess,
} from './utils'

const permissionQueryKey = (appId: string) => ['app-permissions', appId] as const

type PermissionOption<T extends string> = {
  value: T
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

type ScopeOptionProps<T extends string> = {
  option: PermissionOption<T>
  selected: boolean
  disabled?: boolean
  disabledReason?: string
  onSelect: (value: T) => void
}

const ScopeOption = <T extends string>({
  option,
  selected,
  disabled,
  disabledReason,
  onSelect,
}: ScopeOptionProps<T>) => {
  const Icon = option.icon

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex min-h-[72px] w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-state-accent-solid bg-state-accent-hover'
          : 'border-components-panel-border bg-components-panel-bg hover:bg-state-base-hover',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      onClick={() => onSelect(option.value)}
    >
      <Radio isChecked={selected} disabled={disabled} />
      <Icon className="h-5 w-5 shrink-0 text-text-secondary" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{option.title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-text-tertiary">{option.description}</span>
        {disabled && disabledReason && (
          <span className="mt-0.5 block text-xs leading-5 text-text-tertiary">{disabledReason}</span>
        )}
      </span>
    </button>
  )
}

const AppPermissionsPage = () => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const appId = getAppIdFromPathname(pathname)
  const queryClient = useQueryClient()

  const [draftPermission, setDraftPermission] = useState<PermissionDraft | null>(null)

  const { data: permissionData, isLoading: isLoadingPermissions, isError } = useQuery({
    queryKey: permissionQueryKey(appId || ''),
    queryFn: () => fetchAppPermissions(appId || ''),
    enabled: !!appId,
  })
  const { data: membersData } = useMembers()

  const permissionDraft = useMemo<PermissionDraft>(() => ({
    edit_scope: permissionData?.edit_scope ?? 'all_editors',
    edit_members: permissionData?.edit_members ?? [],
    use_scope: permissionData?.use_scope ?? 'public',
    use_members: permissionData?.use_members ?? [],
  }), [permissionData])

  const activeMembers = useMemo(() => {
    return (membersData?.accounts ?? []).filter(member => member.status === 'active')
  }, [membersData?.accounts])

  const editableMembers = useMemo(() => {
    return activeMembers.filter(member => ['owner', 'admin', 'editor'].includes(member.role))
  }, [activeMembers])
  const editableMemberIds = useMemo(() => editableMembers.map(member => member.id), [editableMembers])

  const currentPermission = draftPermission ?? permissionDraft
  const editInheritedUseMemberIds = useMemo(() => {
    return getEditInheritedUseMemberIds(currentPermission, editableMemberIds, permissionData?.creator_id)
  }, [currentPermission, editableMemberIds, permissionData?.creator_id])
  const normalizedCurrentPermission = useMemo(() => {
    return normalizePermissionDraftForEditAccess(
      currentPermission,
      editInheritedUseMemberIds,
      permissionData?.creator_id,
    )
  }, [currentPermission, editInheritedUseMemberIds, permissionData?.creator_id])
  const updatePermissionDraft = useCallback((patch: Partial<PermissionDraft>) => {
    setDraftPermission((prev) => {
      const next = {
        ...permissionDraft,
        ...prev,
        ...patch,
      }
      const inheritedUseMemberIds = getEditInheritedUseMemberIds(next, editableMemberIds, permissionData?.creator_id)
      return normalizePermissionDraftForEditAccess(next, inheritedUseMemberIds, permissionData?.creator_id)
    })
  }, [editableMemberIds, permissionData?.creator_id, permissionDraft])
  const editScope = normalizedCurrentPermission.edit_scope
  const useScope = normalizedCurrentPermission.use_scope
  const editMembers = normalizedCurrentPermission.edit_members
  const useMembersValue = normalizedCurrentPermission.use_members
  const isUseOnlyCreatorDisabled = isUseOnlyCreatorScopeBlocked(editInheritedUseMemberIds, permissionData?.creator_id)

  const roleLabels = useMemo<Record<Member['role'], string>>(() => ({
    owner: t('members.owner', { ns: 'common' }),
    admin: t('members.admin', { ns: 'common' }),
    editor: t('members.editor', { ns: 'common' }),
    normal: t('members.normal', { ns: 'common' }),
    dataset_operator: t('members.datasetOperator', { ns: 'common' }),
  }), [t])

  const canManage = permissionData?.can_manage ?? false
  const isReadonly = !canManage

  const editOptions: Array<PermissionOption<AppEditPermissionScope>> = useMemo(() => [
    {
      value: 'only_creator',
      icon: RiUserLine,
      title: t('permission.edit.onlyCreator.title', { ns: 'app' }),
      description: t('permission.edit.onlyCreator.desc', { ns: 'app' }),
    },
    {
      value: 'selected_editors',
      icon: RiLock2Line,
      title: t('permission.edit.selectedEditors.title', { ns: 'app' }),
      description: t('permission.edit.selectedEditors.desc', { ns: 'app' }),
    },
    {
      value: 'all_editors',
      icon: RiTeamLine,
      title: t('permission.edit.allEditors.title', { ns: 'app' }),
      description: t('permission.edit.allEditors.desc', { ns: 'app' }),
    },
  ], [t])

  const useOptions: Array<PermissionOption<AppUsePermissionScope>> = useMemo(() => [
    {
      value: 'only_creator',
      icon: RiUserLine,
      title: t('permission.use.onlyCreator.title', { ns: 'app' }),
      description: t('permission.use.onlyCreator.desc', { ns: 'app' }),
    },
    {
      value: 'selected_members',
      icon: RiLock2Line,
      title: t('permission.use.selectedMembers.title', { ns: 'app' }),
      description: t('permission.use.selectedMembers.desc', { ns: 'app' }),
    },
    {
      value: 'all_members',
      icon: RiTeamLine,
      title: t('permission.use.allMembers.title', { ns: 'app' }),
      description: t('permission.use.allMembers.desc', { ns: 'app' }),
    },
    {
      value: 'public',
      icon: RiGlobalLine,
      title: t('permission.use.public.title', { ns: 'app' }),
      description: t('permission.use.public.desc', { ns: 'app' }),
    },
  ], [t])

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: AppPermissionUpdatePayload) => updateAppPermissions(appId || '', payload),
    onSuccess: async (res) => {
      queryClient.setQueryData(permissionQueryKey(appId || ''), res)
      setDraftPermission(null)
      await queryClient.invalidateQueries({ queryKey: permissionQueryKey(appId || '') })
      toast.success(t('permission.saveSuccess', { ns: 'app' }))
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : t('permission.saveFailed', { ns: 'app' }))
    },
  })

  const onSave = useCallback(() => {
    if (!appId || isReadonly)
      return
    const normalizedPermission = normalizePermissionDraftForEditAccess(
      normalizedCurrentPermission,
      editInheritedUseMemberIds,
      permissionData?.creator_id,
    )
    mutate({
      edit_scope: normalizedPermission.edit_scope,
      edit_members: normalizedPermission.edit_scope === 'selected_editors' ? normalizedPermission.edit_members : [],
      use_scope: normalizedPermission.use_scope,
      use_members: normalizedPermission.use_scope === 'selected_members' ? normalizedPermission.use_members : [],
    })
  }, [
    appId,
    editInheritedUseMemberIds,
    isReadonly,
    mutate,
    normalizedCurrentPermission,
    permissionData?.creator_id,
  ])

  if (isLoadingPermissions) {
    return (
      <div className="flex h-full items-center justify-center bg-background-body">
        <Loading />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-background-body text-sm text-text-tertiary">
        {t('permission.loadFailed', { ns: 'app' })}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-background-body">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{t('permission.title', { ns: 'app' })}</h1>
            <p className="mt-1 text-sm text-text-tertiary">{t('permission.description', { ns: 'app' })}</p>
          </div>
          <button
            type="button"
            disabled={isReadonly || isPending}
            className={cn(
              'flex h-9 shrink-0 items-center rounded-lg bg-components-button-primary-bg px-4 text-sm font-medium text-components-button-primary-text hover:bg-components-button-primary-bg-hover',
              (isReadonly || isPending) && 'cursor-not-allowed opacity-60',
            )}
            onClick={onSave}
          >
            {isPending ? t('permission.saving', { ns: 'app' }) : t('permission.save', { ns: 'app' })}
          </button>
        </div>

        {isReadonly && (
          <div className="rounded-lg border border-components-panel-border bg-background-section-burn px-4 py-3 text-sm text-text-tertiary">
            {t('permission.readonlyTip', { ns: 'app' })}
          </div>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t('permission.edit.title', { ns: 'app' })}</h2>
            <p className="mt-1 text-sm text-text-tertiary">{t('permission.edit.description', { ns: 'app' })}</p>
          </div>
          <div className="grid gap-3">
            {editOptions.map(option => (
              <ScopeOption
                key={option.value}
                option={option}
                selected={editScope === option.value}
                disabled={isReadonly}
                onSelect={value => updatePermissionDraft({ edit_scope: value })}
              />
            ))}
          </div>
          {editScope === 'selected_editors' && (
            <MemberPermissionPicker
              title={t('permission.edit.memberSelector', { ns: 'app' })}
              emptyText={t('permission.noEditableMembers', { ns: 'app' })}
              members={editableMembers}
              selectedIds={editMembers}
              disabled={isReadonly}
              getRoleLabel={role => roleLabels[role]}
              onChange={ids => updatePermissionDraft({ edit_members: ids })}
            />
          )}
        </section>

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{t('permission.use.title', { ns: 'app' })}</h2>
            <p className="mt-1 text-sm text-text-tertiary">{t('permission.use.description', { ns: 'app' })}</p>
          </div>
          <div className="grid gap-3">
            {useOptions.map((option) => {
              const isDisabledByEditAccess = option.value === 'only_creator' && isUseOnlyCreatorDisabled
              return (
                <ScopeOption
                  key={option.value}
                  option={option}
                  selected={useScope === option.value}
                  disabled={isReadonly || isDisabledByEditAccess}
                  disabledReason={
                    !isReadonly && isDisabledByEditAccess
                      ? t('permission.use.onlyCreator.disabledByEditAccess', { ns: 'app' })
                      : undefined
                  }
                  onSelect={value => updatePermissionDraft({ use_scope: value })}
                />
              )
            })}
          </div>
          {useScope === 'selected_members' && (
            <MemberPermissionPicker
              title={t('permission.use.memberSelector', { ns: 'app' })}
              emptyText={t('permission.noMembers', { ns: 'app' })}
              members={activeMembers}
              selectedIds={useMembersValue}
              lockedIds={editInheritedUseMemberIds}
              lockedLabel={t('permission.use.inheritedFromEdit', { ns: 'app' })}
              disabled={isReadonly}
              getRoleLabel={role => roleLabels[role]}
              onChange={ids => updatePermissionDraft({ use_members: ids })}
            />
          )}
        </section>
      </div>
    </div>
  )
}

export default AppPermissionsPage
