/* eslint-disable @typescript-eslint/require-await */
// Mock binding: async methods satisfy the Promise-returning interface
// signatures but have nothing to actually await.
import type { ISendFilter } from '~~/lib/models/card/send'
import type {
  IBinding,
  IBindingSharedEvents
} from '~~/lib/bindings/definitions/IBinding'
import type { CardSetting } from '~/lib/models/card/setting'
import type { IModelCardSharedEvents } from '~/lib/models/card'
import type { ConversionResult } from '~/lib/conversions/conversionResult'
import type { CreateVersionArgs } from '~/lib/bridge/server'

export const ISendBindingKey = 'sendBinding'

export interface ISendBinding extends IBinding<ISendBindingEvents> {
  getSendFilters: () => Promise<ISendFilter[]>
  getSendSettings: () => Promise<CardSetting[]>
  /**
   * The optional ingestion args carry the DUI-created ingestion (and its
   * pre-allocated version id) down to connectors on the 4.0 artifact path
   * (today: sketchup) — one ingestion per publish, created by the DUI; the
   * server creates the version and the DUI tracks it via the ingestion
   * subscription. Only passed for hosts whose bridge forwards variadic args;
   * other connectors keep receiving a single argument.
   */
  send: (
    modelId: string,
    ingestionId?: string,
    ingestionVersionId?: string
  ) => Promise<void>
  cancelSend: (modelId: string) => Promise<void>
}

export interface ISendBindingEvents
  extends IBindingSharedEvents,
    IModelCardSharedEvents {
  refreshSendFilters: () => void
  setModelsExpired: (modelCardIds: string[]) => void
  setModelSendResult: (args: {
    modelCardId: string
    versionId: string
    sendConversionResults: ConversionResult[]
    ingestionId?: string
  }) => void
  setIdMap: (args: {
    modelCardId: string
    idMap: Record<string, string>
    newSelectedObjectIds: string[]
  }) => void
  /**
   * Use whenever want to cancel model card progress, it is used on Archicad so far since send operation blocks the UI thread.
   */
  triggerCancel: (modelCardId: string) => void
  triggerCreateVersion: (args: CreateVersionArgs) => void
}

export class MockedSendBinding implements ISendBinding {
  public availableMethodNames: string[] = [
    'getSendFilters',
    'getSendSettings',
    'send',
    'cancelSend',
    'showDevTools',
    'openUrl'
  ]
  public async getSendFilters() {
    return []
  }

  public async getSendSettings() {
    return []
  }

  public async send(_modelCardId: string) {
    console.log('no way dude')
  }

  public async cancelSend(_modelCardId: string) {
    console.log('no way dude')
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
