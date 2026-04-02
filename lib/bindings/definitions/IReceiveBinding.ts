/* eslint-disable @typescript-eslint/require-await */
import type { ConversionResult } from '~/lib/conversions/conversionResult'
import type { IModelCardSharedEvents } from '~/lib/models/card'
import type { CardSetting } from '~/lib/models/card/setting'
import type {
  IBinding,
  IBindingSharedEvents
} from '~~/lib/bindings/definitions/IBinding'

export const IReceiveBindingKey = 'receiveBinding'

export interface IReceiveBinding extends IBinding<IReceiveBindingEvents> {
  receive: (modelCardId: string) => Promise<void>
  getReceiveSettings: () => Promise<CardSetting[]>
  cancelReceive: (modelId: string) => Promise<void>
}

export interface IReceiveBindingEvents
  extends IBindingSharedEvents,
    IModelCardSharedEvents {
  setModelsExpired: (modelCardIds: string[]) => void
  setModelReceiveResult: (args: {
    modelCardId: string
    bakedObjectIds: string[]
    conversionResults: ConversionResult[]
  }) => void
}

export class MockedReceiveBinding implements IReceiveBinding {
  public async getReceiveSettings() {
    return []
  }

  public async receive(_modelCardId: string) {
    console.log('no way dude')
  }

  public async cancelReceive(_modelCardId: string) {
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
