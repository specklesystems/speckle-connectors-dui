import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'

const SEQ_URL = 'https://seq-dev.speckle.systems/api/events/raw'

type LogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal'

const collectCommonProperties = () => {
  const { accounts, activeAccount } = useAccountStore()
  return {
    user: {
      id: activeAccount.accountInfo.userInfo.id
    },
    dui3: true,
    accountCount: accounts.length
  }
}

const collectResources = () => {
  const hostAppStore = useHostAppStore()
  return {
    '@ra': {
      connector: {
        name: hostAppStore.hostAppName
      },
      service: {
        version: hostAppStore.connectorVersion
      }
    }
  }
}

// const collectServices = () => {
//   const hostAppStore = useHostAppStore()
//   return {
//     '@sa': {
//       service: {
//         version: hostAppStore.connectorVersion
//       }
//     }
//   }
// }

export const logToSeq = async (
  level: LogLevel,
  message: string,
  properties: Record<string, unknown> = {}
) => {
  try {
    const logEvent = {
      '@t': new Date().toISOString(),
      '@l': level,
      '@m': message,
      ...collectResources(),
      // ...collectServices(),
      ...collectCommonProperties(),
      ...properties
    }

    const response = await fetch(SEQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.serilog.clef',
        'X-Seq-ApiKey': 'y5YnBp12ZE1Czh4tzZWn'
      },
      body: JSON.stringify(logEvent) + '\n'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `[Seq Logger] Failed to log: ${response.status} ${response.statusText} - ${errorText}`
      )
    }
  } catch (err) {
    console.error('[Seq Logger] Failed to log', err)
  }
}
