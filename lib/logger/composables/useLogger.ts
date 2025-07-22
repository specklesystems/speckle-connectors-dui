import { useAccountStore } from '~/store/accounts'
import { useHostAppStore } from '~/store/hostApp'

const SEQ_URL = 'https://seq-dev.speckle.systems/ingest/clef'

type LogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal'

const collectCommonProperties = () => {
  const { accounts, activeAccount } = useAccountStore()
  const hostAppStore = useHostAppStore()

  return {
    dui3: true,
    accountCount: accounts.length,
    userId: activeAccount.accountInfo.userInfo.id,
    'connector.name': hostAppStore.hostAppName,
    'service.version': hostAppStore.connectorVersion
  }
}

export const logToSeq = async (
  level: LogLevel,
  message: string,
  properties: Record<string, unknown> = {}
) => {
  try {
    const commonProps = collectCommonProperties()
    const logEvent = {
      '@t': new Date().toISOString(), // Timestamp
      '@l': level, // Log level
      '@m': message, // Message
      ...commonProps,
      ...properties // Additional properties
    }

    // Convert the log event object to a JSON string, followed by a newline.
    // Seq expects newline-delimited JSON for CLEF.
    const clef = JSON.stringify(logEvent) + '\n'

    const response = await fetch(SEQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.serilog.clef',
        'X-Seq-ApiKey': 'y5YnBp12ZE1Czh4tzZWn'
      },
      body: clef
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
