import type { IRawBridge } from '~/lib/bridge/definitions'
import { GenericBridge } from '~/lib/bridge/generic'
import { SketchupBridge } from '~/lib/bridge/sketchup'

import type { IBasicConnectorBinding } from '~/lib/bindings/definitions/IBasicConnectorBinding'
import type { IAccountBinding } from '~/lib/bindings/definitions/IAccountBinding'
import {
  IAccountBindingKey,
  MockedAccountBinding
} from '~/lib/bindings/definitions/IAccountBinding'

import type { ITestBinding } from '~/lib/bindings/definitions/ITestBinding'
import {
  ITestBindingKey,
  MockedTestBinding
} from '~/lib/bindings/definitions/ITestBinding'

import type { IConfigBinding } from '~/lib/bindings/definitions/IConfigBinding'
import {
  IConfigBindingKey,
  MockedConfigBinding
} from '~/lib/bindings/definitions/IConfigBinding'

import {
  IBasicConnectorBindingKey,
  MockedBaseBinding
} from '~/lib/bindings/definitions/IBasicConnectorBinding'

import type { ISendBinding } from '~/lib/bindings/definitions/ISendBinding'
import {
  ISendBindingKey,
  MockedSendBinding
} from '~/lib/bindings/definitions/ISendBinding'
import type { IReceiveBinding } from '~/lib/bindings/definitions/IReceiveBinding'
import {
  IReceiveBindingKey,
  MockedReceiveBinding
} from '~/lib/bindings/definitions/IReceiveBinding'

import type { ISelectionBinding } from '~/lib/bindings/definitions/ISelectionBinding'
import {
  ISelectionBindingKey,
  MockedSelectionBinding
} from '~/lib/bindings/definitions/ISelectionBinding'
import type { ITopLevelExpectionHandlerBinding } from '~/lib/bindings/definitions/ITopLevelExceptionHandlerBinding'
import { ITopLevelExpectionHandlerBindingKey } from '~/lib/bindings/definitions/ITopLevelExceptionHandlerBinding'

// Makes TS happy
declare let globalThis: Record<string, unknown> & {
  CefSharp?: { BindObjectAsync: (name: string) => Promise<void> }
  chrome?: { webview: { hostObjects: Record<string, IRawBridge> } }
  sketchup?: Record<string, unknown>
  DG?: { LoadObject: (name: string) => Promise<void> }
}

const isWebview = () => !!(globalThis.chrome && globalThis.chrome.webview)
const isSketchup = () => !!globalThis.sketchup
const isCefSharp = () => !!globalThis.CefSharp
const isArchicad = () => isCefSharp() && !!globalThis.DG
const isConnector = () => isWebview() || isSketchup() || isCefSharp() || isArchicad()

/**
 * Here we are loading any bindings that we expect to have from all
 * connectors. If some are not present, that's okay - we're going to
 * strip or customize functionality from the ui itself.
 */
export default defineNuxtPlugin(async () => {
  const isRunningOnConnector = isConnector()
  const isDev = import.meta.dev
  if (!isRunningOnConnector) {
    // The state that we wouldn't wanna show any connector related visuals on production like in dui.speckle.systems
    console.warn(
      '⚠️ You are a bad boy because you are not running DUI in a connector! ⚠️'
    )
  }

  // Registers a set of non existent bindings as a test.
  const nonExistantBindings = await tryHoistBinding('nonExistantBindings')

  // Registers some default test bindings.
  const testBindings =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<ITestBinding>(ITestBindingKey)
      : hoistMockBinding(new MockedTestBinding(), ITestBindingKey)

  // Actual bindings follow below.
  const configBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<IConfigBinding>(IConfigBindingKey)
      : hoistMockBinding(new MockedConfigBinding(), IConfigBindingKey)

  const accountBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<IAccountBinding>(IAccountBindingKey)
      : hoistMockBinding(new MockedAccountBinding(), IAccountBindingKey)

  const baseBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<IBasicConnectorBinding>(IBasicConnectorBindingKey)
      : hoistMockBinding(new MockedBaseBinding(), IBasicConnectorBindingKey)

  const sendBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<ISendBinding>(ISendBindingKey)
      : hoistMockBinding(new MockedSendBinding(), ISendBindingKey)

  const receiveBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<IReceiveBinding>(IReceiveBindingKey)
      : hoistMockBinding(new MockedReceiveBinding(), IReceiveBindingKey)

  const selectionBinding =
    isRunningOnConnector && !isDev
      ? await tryHoistBinding<ISelectionBinding>(ISelectionBindingKey)
      : hoistMockBinding(new MockedSelectionBinding(), ISendBindingKey)

  const topLevelExceptionHandlerBinding =
    await tryHoistBinding<ITopLevelExpectionHandlerBinding>(
      ITopLevelExpectionHandlerBindingKey
    )

  // Any binding implments these two methods below, we just choose one to
  // expose globally to the app.
  const showDevTools = () => {
    configBinding.showDevTools()
  }

  const openUrl = (url: string) => {
    configBinding.openUrl(url)
  }

  return {
    provide: {
      isRunningOnConnector,
      isDev,
      nonExistantBindings,
      testBindings,
      configBinding,
      accountBinding,
      baseBinding,
      sendBinding,
      receiveBinding,
      selectionBinding,
      topLevelExceptionHandlerBinding,
      showDevTools,
      openUrl
    }
  }
})

/**
 * Checks possible browser window targets for a given binding, and, if it finds it,
 * creates a bridge for it and registers it in the global scope.
 * @param name binding name
 * @returns null if the binding was not found, or the binding.
 */
const tryHoistBinding = async <T>(name: string) => {
  let bridge: GenericBridge | SketchupBridge | null = null
  let tempBridge: GenericBridge | SketchupBridge | null = null

  if (globalThis.chrome && globalThis.chrome.webview && !tempBridge) {
    tempBridge = new GenericBridge(globalThis.chrome.webview.hostObjects[name])
  }

  if (globalThis.sketchup && !tempBridge) {
    tempBridge = new SketchupBridge(name)
  }

  if (globalThis.CefSharp && globalThis.DG && !tempBridge) {
    await globalThis.CefSharp.BindObjectAsync(name)
    tempBridge = new GenericBridge(globalThis[name] as unknown as IRawBridge, true)
  }

  if (globalThis.CefSharp && !tempBridge) {
    await globalThis.CefSharp.BindObjectAsync(name)
    tempBridge = new GenericBridge(globalThis[name] as unknown as IRawBridge)
  }

  const res = await tempBridge?.create()
  if (res) bridge = tempBridge

  if (!bridge) {
    console.warn(`Failed to bind ${name} binding.`)
    return bridge as unknown as T
  }

  globalThis[name] = bridge
  console.log(
    `%c✔ ${name} connector binding added succesfully.`,
    'color: green; font-weight: bold; font-size: small'
  )
  return bridge as unknown as T
}

const hoistMockBinding = <T>(mockBinding: T, name: string) => {
  globalThis[name] = mockBinding
  console.log(
    `%c✔ Mocked ${name} binding added succesfully.`,
    'color: green; font-weight: bold; font-size: small'
  )
  return mockBinding
}
