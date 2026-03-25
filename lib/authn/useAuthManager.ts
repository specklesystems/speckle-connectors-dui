const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CHALLENGE_KEY = 'speckle_challenge'
const CHALLENGE_URL_KEY = 'speckle_url_challenge'
const CODE_VERIFIER_KEY = 'speckle_code_verifier'

function createRandomString(length = 12): string {
  const values = crypto.getRandomValues(new Uint8Array(length))
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(values[i] % chars.length)
  }
  return result
}

/**
 * Computes SHA-256 hash of a string and returns it as base64url.
 * This is the PKCE code_challenge derivation from a code_verifier.
 */
async function computeS256Challenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  // base64url encode: standard base64 with +→- /→_ and no padding
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export interface ChallengeData {
  /** The raw random string (code_verifier in PKCE terms) */
  codeVerifier: string
  /** SHA-256 base64url hash of codeVerifier (code_challenge for S256 method) */
  codeChallenge: string
}

export function useAuthManager() {
  /**
   * Generates a PKCE code_verifier + code_challenge pair and persists to localStorage.
   * Used by redirect-based sign-in flows (SignInFlow) that need to
   * recover the values after the browser navigates away and back.
   */
  const generateChallenge = async (url: string): Promise<ChallengeData> => {
    const codeVerifier = createRandomString(43)
    const codeChallenge = await computeS256Challenge(codeVerifier)
    localStorage.setItem(CHALLENGE_KEY, codeChallenge)
    localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier)
    localStorage.setItem(CHALLENGE_URL_KEY, url)
    return { codeVerifier, codeChallenge }
  }

  /**
   * Generates a PKCE code_verifier + code_challenge pair without persisting to localStorage.
   * Used by flows that keep values in memory (ExchangeTokenSignInFlow)
   * so they don't overwrite the redirect flow's stored data.
   */
  const generateLocalChallenge = async (): Promise<ChallengeData> => {
    const codeVerifier = createRandomString(43)
    const codeChallenge = await computeS256Challenge(codeVerifier)
    return { codeVerifier, codeChallenge }
  }

  const getChallenge = (): string | null => {
    return localStorage.getItem(CHALLENGE_KEY)
  }

  const getCodeVerifier = (): string | null => {
    return localStorage.getItem(CODE_VERIFIER_KEY)
  }

  const getChallengeUrl = (): string | null => {
    return localStorage.getItem(CHALLENGE_URL_KEY)
  }

  return {
    getChallenge,
    getCodeVerifier,
    getChallengeUrl,
    generateChallenge,
    generateLocalChallenge
  }
}
