import md5 from '~/lib/common/helpers/md5'
import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'

const SEQ_URL = 'https://seq-dev.speckle.systems/api/events/raw'

type LogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal'

const collectCommonProperties = () => {
  const { accounts, activeAccount } = useAccountStore()
  const hashedEmail =
    '@' +
    md5(activeAccount.accountInfo.userInfo.email.toLowerCase() as string).toUpperCase()
  return {
    user: {
      id: activeAccount.accountInfo.userInfo.id,
      distinctId: hashedEmail
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
        slug: hostAppStore.hostAppName,
        hostAppVersion: hostAppStore.hostAppVersion,
        version: hostAppStore.connectorVersion
      },
      service: {
        version: hostAppStore.connectorVersion // this needs alignment with .NET SDK, actually this should be connector.version instead service.version
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
