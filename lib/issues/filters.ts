import dayjs from 'dayjs'
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import { IssuePriority, IssueStatus } from '~/lib/common/generated/gql/graphql'

export type IssueFilters = {
  statuses: IssueStatus[]
  priorities: IssuePriority[]
  assigneeIds: string[]
  labelIds: string[]
  overdue: boolean
}

const activeStatuses = [IssueStatus.Open, IssueStatus.ReadyForReview]

export type StatusTabId = 'active' | 'review' | 'resolved' | 'all'
type StatusTab = { id: StatusTabId; name: string; statuses: IssueStatus[] }

export const statusTabs: StatusTab[] = [
  {
    id: 'active',
    name: 'Active',
    statuses: activeStatuses
  },
  { id: 'review', name: 'In review', statuses: [IssueStatus.ReadyForReview] },
  { id: 'resolved', name: 'Resolved', statuses: [IssueStatus.Resolved] },
  { id: 'all', name: 'All', statuses: [] }
]

export const priorityOptions: { id: IssuePriority; name: string }[] = [
  { id: IssuePriority.High, name: 'High' },
  { id: IssuePriority.Medium, name: 'Medium' },
  { id: IssuePriority.Low, name: 'Low' },
  { id: IssuePriority.None, name: 'No priority' }
]

export const defaultIssueFilters = (meId?: string): IssueFilters => ({
  statuses: [...activeStatuses],
  priorities: [],
  assigneeIds: meId ? [meId] : [],
  labelIds: [],
  overdue: false
})

export const isOverdue = (issue: IssuesItemFragment, now: Date = new Date()) =>
  !!issue.dueDate &&
  issue.status !== IssueStatus.Resolved &&
  dayjs(issue.dueDate).isBefore(dayjs(now), 'day')

const matchesIssueFilters = (
  issue: IssuesItemFragment,
  filters: IssueFilters,
  now: Date = new Date()
): boolean => {
  if (filters.statuses.length && !filters.statuses.includes(issue.status)) return false
  if (filters.priorities.length && !filters.priorities.includes(issue.priority))
    return false
  if (
    filters.assigneeIds.length &&
    !filters.assigneeIds.includes(issue.assignee?.user.id ?? '')
  )
    return false
  if (filters.labelIds.length) {
    if (!issue.labels.some((l) => filters.labelIds.includes(l.id))) return false
  }
  if (filters.overdue && !isOverdue(issue, now)) return false
  return true
}

export const applyIssueFilters = (
  issues: IssuesItemFragment[],
  filters: IssueFilters,
  now?: Date
) => issues.filter((issue) => matchesIssueFilters(issue, filters, now))

// FEA-752: a tab's count is what selecting it would show, so the other filters
// stay applied rather than counting the model's whole issue list.
export const countStatusTabs = (
  issues: IssuesItemFragment[],
  filters: IssueFilters,
  now?: Date
): Record<StatusTabId, number> =>
  Object.fromEntries(
    statusTabs.map((tab) => [
      tab.id,
      applyIssueFilters(issues, { ...filters, statuses: tab.statuses }, now).length
    ])
  ) as Record<StatusTabId, number>

export const activeStatusTabId = (filters: IssueFilters) =>
  statusTabs.find(
    (tab) =>
      tab.statuses.length === filters.statuses.length &&
      tab.statuses.every((s) => filters.statuses.includes(s))
  )?.id

export const labelOptionsOf = (issues: IssuesItemFragment[]) => {
  const byId = new Map<string, IssuesItemFragment['labels'][number]>()
  for (const issue of issues)
    for (const label of issue.labels) byId.set(label.id, label)
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// FEA-752: the card's account can resolve after the dialog mounts. Mine applies
// then, unless the user already picked an assignee scope.
export const withLateMeId = (
  filters: IssueFilters,
  meId: string | undefined,
  previousMeId: string | undefined
): IssueFilters =>
  meId && !previousMeId && !filters.assigneeIds.length
    ? { ...filters, assigneeIds: [meId] }
    : filters
