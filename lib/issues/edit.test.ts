import { describe, expect, it } from 'vitest'
import { createSerialSaver, fieldEditability, withCurrent } from '~/lib/issues/edit'
import type { IssueEditPermissions } from '~/lib/issues/edit'

const allowed = { authorized: true, message: 'OK' }
const denied = { authorized: false, message: 'Only project editors can do this' }

const permissions = (
  overrides: Partial<IssueEditPermissions> = {}
): IssueEditPermissions => ({
  canEditStatus: allowed,
  canEditPriority: allowed,
  canEditAssignee: allowed,
  canEditLabels: allowed,
  ...overrides
})

describe('fieldEditability', () => {
  it('lets me edit every field the server authorizes', () => {
    expect(fieldEditability(permissions())).toEqual({
      status: { editable: true },
      priority: { editable: true },
      assignee: { editable: true },
      labels: { editable: true }
    })
  })

  it("keeps a field read-only with the server's reason when I can't edit it", () => {
    const result = fieldEditability(permissions({ canEditAssignee: denied }))
    expect(result.assignee).toEqual({ editable: false, reason: denied.message })
  })

  it('keeps every field read-only while permissions are unknown', () => {
    const result = fieldEditability(undefined)
    expect(Object.values(result).every((f) => !f.editable)).toBe(true)
  })
})

describe('withCurrent', () => {
  it('still offers the current assignee when the search results leave them out', () => {
    const options = [{ id: 'a', name: 'Ada' }]
    const current = [{ id: 'z', name: 'Zed' }]
    expect(withCurrent(options, current).map((o) => o.id)).toEqual(['a', 'z'])
  })

  it('does not list an option twice', () => {
    const options = [{ id: 'a', name: 'Ada' }]
    expect(withCurrent(options, options)).toHaveLength(1)
  })
})

describe('createSerialSaver', () => {
  it('runs saves in call order, even when an earlier one is slower', async () => {
    const landed: string[][] = []
    const delays = [30, 0]
    const save = createSerialSaver(
      (labels: string[]) =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            landed.push(labels)
            resolve()
          }, delays.shift())
        )
    )
    await Promise.all([save(['bug']), save(['bug', 'clash'])])
    expect(landed).toEqual([['bug'], ['bug', 'clash']])
  })

  it('runs the next save after one fails', async () => {
    const landed: number[] = []
    const save = createSerialSaver((n: number) => {
      if (n === 1) return Promise.reject(new Error('offline'))
      landed.push(n)
      return Promise.resolve()
    })
    await expect(save(1)).rejects.toThrow('offline')
    await save(2)
    expect(landed).toEqual([2])
  })
})
