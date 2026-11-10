import { IssueStatus } from '~/lib/common/generated/gql/graphql'
import type { IssueEditPermissionsQuery } from '~/lib/common/generated/gql/graphql'

export type EditableIssueField = 'status' | 'priority' | 'assignee' | 'labels'

export type IssueEditPermissions = NonNullable<
  IssueEditPermissionsQuery['project']['issue']
>['permissions']

export type FieldEditability = { editable: boolean; reason?: string }

export const statusOptions: { id: IssueStatus; name: string }[] = [
  { id: IssueStatus.Open, name: 'Open' },
  { id: IssueStatus.ReadyForReview, name: 'Ready for review' },
  { id: IssueStatus.Resolved, name: 'Resolved' }
]

const permissionKeys: Record<
  EditableIssueField,
  Exclude<keyof IssueEditPermissions, '__typename'>
> = {
  status: 'canEditStatus',
  priority: 'canEditPriority',
  assignee: 'canEditAssignee',
  labels: 'canEditLabels'
}

export const fieldEditability = (
  permissions: IssueEditPermissions | null | undefined
): Record<EditableIssueField, FieldEditability> =>
  Object.fromEntries(
    Object.entries(permissionKeys).map(([field, key]) => {
      const check = permissions?.[key]
      return [
        field,
        check?.authorized
          ? { editable: true }
          : { editable: false, reason: check?.message }
      ]
    })
  ) as Record<EditableIssueField, FieldEditability>

export const withCurrent = <T extends { id: string }>(options: T[], current: T[]) => {
  const ids = new Set(options.map((o) => o.id))
  return [...options, ...current.filter((c) => !ids.has(c.id))]
}

// FEA-775: label edits send the full set each time, so saves run one after
// another; overlapping saves could land out of order and drop a label.
export const createSerialSaver = <T>(save: (value: T) => Promise<unknown>) => {
  let queue: Promise<unknown> = Promise.resolve()
  return (value: T) => {
    const next = queue.then(() => save(value))
    queue = next.catch(() => undefined)
    return next
  }
}
