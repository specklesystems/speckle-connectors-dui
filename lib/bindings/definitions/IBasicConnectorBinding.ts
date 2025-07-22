import type {
  IBinding,
  IBindingSharedEvents
} from '~~/lib/bindings/definitions/IBinding'
import type { IModelCard, IModelCardSharedEvents } from '~~/lib/models/card'

export const IBasicConnectorBindingKey = 'baseBinding'

// Needs to be agreed between Frontend and Core
export interface IBasicConnectorBinding
  extends IBinding<IBasicConnectorBindingHostEvents> {
  // Various
  /**
   * return `slug` from connectors, we should have name it better at the beginning
   */
  getSourceApplicationName: () => Promise<string>
  getSourceApplicationVersion: () => Promise<string>
  getConnectorVersion: () => Promise<string>
  getDocumentInfo: () => Promise<DocumentInfo>

  // Document state calls
  getDocumentState: () => Promise<DocumentModelStore>
  addModel: (model: IModelCard) => Promise<void>
  updateModel: (model: IModelCard) => Promise<void>
  highlightModel: (modelCardId: string) => Promise<void>
  highlightObjects: (objectIds: string[]) => Promise<void>
  removeModel: (model: IModelCard) => Promise<void>
  removeModels: (models: IModelCard[]) => Promise<void>
}

export interface IBasicConnectorBindingHostEvents
  extends IBindingSharedEvents,
    IModelCardSharedEvents {
  documentChanged: () => void
}

export type DocumentModelStore = {
  models: IModelCard[]
}

export type DocumentInfo = {
  location: string
  name: string
  id: string
  message?: string
}

export type ToastInfo = {
  modelCardId: string
  text: string
  level: 'info' | 'danger' | 'warning' | 'success'
  action?: ToastAction
  timeout?: number
}

export type ToastAction = {
  url: string
  name: string
}

export class MockedBaseBinding implements IBasicConnectorBinding {
  public async getSourceApplicationName() {
    return await 'headless'
  }

  public async getSourceApplicationVersion() {
    return await 'dev'
  }

  public async getConnectorVersion() {
    return await 'dev'
  }

  public async getDocumentInfo() {
    return (await {
      id: 'whatever',
      name: 'test',
      location: 'whocares'
    }) as DocumentInfo
  }

  public async getDocumentState() {
    return (await { models: [] }) as DocumentModelStore
  }

  public async addModel(_model: IModelCard) {
    await console.log('no way dude')
  }

  public async removeModel(_model: IModelCard) {
    await console.log('no way dude')
  }

  public async removeModels(_models: IModelCard[]) {
    await console.log('no way dude')
  }

  public async updateModel(_model: IModelCard) {
    await console.log('no way dude')
  }

  public async highlightModel(_modelCardId: string) {
    await console.log('no way dude')
  }

  public async highlightObjects(_objectIds: string[]) {
    await console.log('no way dude')
  }

  public async showDevTools() {
    await console.log('No way dude')
  }

  public async openUrl(url: string) {
    await window.open(url)
  }

  public on() {
    return
  }
}
