/* eslint-disable @typescript-eslint/require-await */
// Mock binding: async methods satisfy the Promise-returning interface
// signatures but have nothing to actually await.
import type {
  IBinding,
  IBindingSharedEvents
} from '~~/lib/bindings/definitions/IBinding'

export const ISelectionBindingKey = 'selectionBinding'

export interface ISelectionBinding extends IBinding<ISelectionBindingHostEvents> {
  getSelection: () => Promise<SelectionInfo>
}

export interface ISelectionBindingHostEvents extends IBindingSharedEvents {
  setSelection: (args: SelectionInfo) => void
}

export type SelectionInfo = {
  summary?: string
  selectedObjectIds: string[]
}

export class MockedSelectionBinding implements ISelectionBinding {
  public async getSelection() {
    return {
      summary: '2 objects selected over mock binding',
      selectedObjectIds: ['1', '2', '3']
    } as SelectionInfo
  }

  public async showDevTools() {
    console.log('No way dude')
  }

  public async openUrl(url: string) {
    window.open(url)
  }

  public on() {
    return
  }
}
