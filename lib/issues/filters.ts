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

export type StatusTab = { id: string; name: string; statuses: IssueStatus[] }

export const statusTabs: StatusTab[] = [
  {
    id: 'active',
    name: 'Active',
    statuses: [IssueStatus.Open, IssueStatus.ReadyForReview]
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
  statuses: [...statusTabs[0].statuses],
  priorities: [],
  assigneeIds: meId ? [meId] : [],
  labelIds: [],
  overdue: false
})

export const isOverdue = (issue: IssuesItemFragment, now: Date = new Date()) =>
  !!issue.dueDate &&
  issue.status !== IssueStatus.Resolved &&
  dayjs(issue.dueDate).isBefore(dayjs(now), 'day')

export const matchesIssueFilters = (
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

/** Each tab counts what it would show with every other active filter kept. */
export const countStatusTabs = (
  issues: IssuesItemFragment[],
  filters: IssueFilters,
  now?: Date
): Record<string, number> =>
  Object.fromEntries(
    statusTabs.map((tab) => [
      tab.id,
      applyIssueFilters(issues, { ...filters, statuses: tab.statuses }, now).length
    ])
  )

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
