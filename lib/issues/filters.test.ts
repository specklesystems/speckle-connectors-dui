import { describe, expect, it } from 'vitest'
import type { IssuesItemFragment } from '~/lib/common/generated/gql/graphql'
import { IssuePriority, IssueStatus } from '~/lib/common/generated/gql/graphql'
import {
  activeStatusTabId,
  applyIssueFilters,
  countStatusTabs,
  defaultIssueFilters,
  isOverdue,
  labelOptionsOf,
  withLateMeId,
  type IssueFilters
} from '~/lib/issues/filters'

const NOW = new Date(2026, 10, 9, 15, 0)

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
  it('lets me find resolved issues through the status filter', () => {
    const issues = [issue('open'), issue('done', { status: IssueStatus.Resolved })]
    expect(
      ids(applyIssueFilters(issues, { ...none, statuses: [IssueStatus.Resolved] }, NOW))
    ).toEqual(['done'])
  })

  it('narrows the list to the priorities I pick', () => {
    const issues = [
      issue('high', { priority: IssuePriority.High }),
      issue('low', { priority: IssuePriority.Low })
    ]
    expect(
      ids(applyIssueFilters(issues, { ...none, priorities: [IssuePriority.High] }, NOW))
    ).toEqual(['high'])
  })

  it('shows issues carrying any of the labels I pick', () => {
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

  it('narrows the list to overdue issues when I ask for them', () => {
    const issues = [
      issue('late', { dueDate: new Date(2026, 9, 1).toISOString() }),
      issue('undated')
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
  it('counts what each status would show with my other filters kept', () => {
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
  it('highlights Active whatever order its statuses were picked in', () => {
    expect(
      activeStatusTabId({
        ...none,
        statuses: [IssueStatus.ReadyForReview, IssueStatus.Open]
      })
    ).toBe('active')
  })

  it('highlights All when no status is picked', () => {
    expect(activeStatusTabId(none)).toBe('all')
  })

  it('highlights nothing for a status set no tab offers', () => {
    expect(activeStatusTabId({ ...none, statuses: [IssueStatus.Open] })).toBeUndefined()
  })
})

describe('labelOptionsOf', () => {
  it('offers each label on the model once, by name', () => {
    const qa = { id: 'qa', name: 'QA', hexColor: '#0f0' }
    const mep = { id: 'mep', name: 'MEP', hexColor: '#f00' }
    const issues = [issue('a', { labels: [qa, mep] }), issue('b', { labels: [qa] })]
    expect(labelOptionsOf(issues).map((l) => l.id)).toEqual(['mep', 'qa'])
  })
})

describe('withLateMeId', () => {
  it('switches to my issues once my account loads', () => {
    expect(withLateMeId(defaultIssueFilters(), 'me', undefined).assigneeIds).toEqual([
      'me'
    ])
  })

  it('keeps an assignee scope I already picked', () => {
    const picked = { ...defaultIssueFilters(), assigneeIds: ['ana'] }
    expect(withLateMeId(picked, 'me', undefined)).toBe(picked)
  })

  it('leaves Everyone alone when the account was already known', () => {
    const everyone = { ...defaultIssueFilters('me'), assigneeIds: [] }
    expect(withLateMeId(everyone, 'me', 'me')).toBe(everyone)
  })
})
