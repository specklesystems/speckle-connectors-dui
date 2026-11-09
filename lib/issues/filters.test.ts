import { describe, expect, it } from 'vitest'
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import { IssuePriority, IssueStatus } from '~/lib/common/generated/gql/graphql'
import {
  activeStatusTabId,
  applyIssueFilters,
  countStatusTabs,
  defaultIssueFilters,
  isOverdue,
  type IssueFilters
} from '~/lib/issues/filters'

const NOW = new Date(2026, 10, 9, 15, 0) // 9 Nov 2026, local time

const issue = (
  id: string,
  over: Partial<IssuesItemFragment> & { assigneeId?: string | null } = {}
): IssuesItemFragment => {
  const { assigneeId = null, ...rest } = over
  return {
    id,
    identifier: id,
    title: id,
    status: IssueStatus.Open,
    priority: IssuePriority.None,
    viewerState: null,
    resourceIdString: 'model',
    dueDate: null,
    labels: [],
    assignee: assigneeId
      ? { id: `p-${assigneeId}`, user: { id: assigneeId, name: assigneeId } }
      : null,
    author: null,
    description: null,
    activities: null,
    replies: { totalCount: 0, items: [] },
    ...rest
  }
}

const none: IssueFilters = {
  statuses: [],
  priorities: [],
  assigneeIds: [],
  labelIds: [],
  overdue: false
}

const ids = (list: IssuesItemFragment[]) => list.map((i) => i.id)

describe('defaultIssueFilters', () => {
  it('shows my active issues', () => {
    const issues = [
      issue('mine-open', { assigneeId: 'me' }),
      issue('mine-review', { assigneeId: 'me', status: IssueStatus.ReadyForReview }),
      issue('mine-resolved', { assigneeId: 'me', status: IssueStatus.Resolved }),
      issue('theirs-open', { assigneeId: 'ana' }),
      issue('unassigned')
    ]
    expect(ids(applyIssueFilters(issues, defaultIssueFilters('me'), NOW))).toEqual([
      'mine-open',
      'mine-review'
    ])
  })

  it("shows everyone's active issues when the user is unknown", () => {
    const issues = [issue('a', { assigneeId: 'ana' }), issue('b')]
    expect(ids(applyIssueFilters(issues, defaultIssueFilters(), NOW))).toEqual([
      'a',
      'b'
    ])
  })
})

describe('applyIssueFilters', () => {
  it('reaches resolved issues through the status filter', () => {
    const issues = [issue('open'), issue('done', { status: IssueStatus.Resolved })]
    expect(
      ids(applyIssueFilters(issues, { ...none, statuses: [IssueStatus.Resolved] }, NOW))
    ).toEqual(['done'])
  })

  it('filters by priority', () => {
    const issues = [
      issue('high', { priority: IssuePriority.High }),
      issue('low', { priority: IssuePriority.Low })
    ]
    expect(
      ids(applyIssueFilters(issues, { ...none, priorities: [IssuePriority.High] }, NOW))
    ).toEqual(['high'])
  })

  it('matches any selected label', () => {
    const mep = { id: 'mep', name: 'MEP', hexColor: '#f00' }
    const qa = { id: 'qa', name: 'QA', hexColor: '#0f0' }
    const issues = [
      issue('mep', { labels: [mep] }),
      issue('both', { labels: [mep, qa] }),
      issue('bare')
    ]
    expect(
      ids(applyIssueFilters(issues, { ...none, labelIds: ['qa', 'mep'] }, NOW))
    ).toEqual(['mep', 'both'])
  })

  it('filters to overdue issues', () => {
    const issues = [
      issue('late', { dueDate: new Date(2026, 10, 8, 23, 0).toISOString() }),
      issue('later', { dueDate: new Date(2026, 10, 20).toISOString() })
    ]
    expect(ids(applyIssueFilters(issues, { ...none, overdue: true }, NOW))).toEqual([
      'late'
    ])
  })
})

describe('isOverdue', () => {
  it('is false for an issue due later today', () => {
    expect(
      isOverdue(issue('a', { dueDate: new Date(2026, 10, 9, 9, 0).toISOString() }), NOW)
    ).toBe(false)
  })

  it('is true from the day after the due date', () => {
    expect(
      isOverdue(
        issue('a', { dueDate: new Date(2026, 10, 8, 23, 59).toISOString() }),
        NOW
      )
    ).toBe(true)
  })

  it('is never true for a resolved issue', () => {
    const late = new Date(2026, 9, 1).toISOString()
    expect(
      isOverdue(issue('a', { dueDate: late, status: IssueStatus.Resolved }), NOW)
    ).toBe(false)
  })

  it('is false without a due date', () => {
    expect(isOverdue(issue('a'), NOW)).toBe(false)
  })
})

describe('countStatusTabs', () => {
  it('counts each tab with every other active filter kept', () => {
    const issues = [
      issue('my-open', { assigneeId: 'me' }),
      issue('my-review', { assigneeId: 'me', status: IssueStatus.ReadyForReview }),
      issue('my-done', { assigneeId: 'me', status: IssueStatus.Resolved }),
      issue('their-open', { assigneeId: 'ana' })
    ]
    expect(countStatusTabs(issues, defaultIssueFilters('me'), NOW)).toEqual({
      active: 2,
      review: 1,
      resolved: 1,
      all: 3
    })
  })
})

describe('activeStatusTabId', () => {
  it('matches a tab regardless of status order', () => {
    expect(
      activeStatusTabId({
        ...none,
        statuses: [IssueStatus.ReadyForReview, IssueStatus.Open]
      })
    ).toBe('active')
    expect(activeStatusTabId(none)).toBe('all')
  })
})
