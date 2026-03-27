const CHALLENGE_KEY = 'speckle_challenge'
const CHALLENGE_URL_KEY = 'speckle_url_challenge'
const CODE_VERIFIER_KEY = 'speckle_code_verifier'

function toBase64Url(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generates a cryptographically random base64url-encoded string.
 * 32 bytes → 43 characters after base64url encoding (within the RFC 7636 range of 43-128).
 */
function createCodeVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return toBase64Url(bytes)
}

/**
 * Computes SHA-256 hash of a string and returns it as base64url.
 * This is the PKCE code_challenge derivation from a code_verifier.
 */
async function computeS256Challenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toBase64Url(new Uint8Array(digest))
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
    const codeVerifier = createCodeVerifier()
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
    const codeVerifier = createCodeVerifier()
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
