const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CHALLENGE_KEY = 'speckle_challenge'
const CHALLENGE_URL_KEY = 'speckle_url_challenge'

function createChallengeString(): string {
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function useAuthManager() {
  /**
   * Generates a challenge and persists it to localStorage.
   * Used by redirect-based sign-in flows (SignInFlow) that need to
   * recover the challenge after the browser navigates away and back.
   */
  const generateChallenge = (url: string): string => {
    const result = createChallengeString()
    localStorage.setItem(CHALLENGE_KEY, result)
    localStorage.setItem(CHALLENGE_URL_KEY, url)
    return result
  }

  /**
   * Generates a challenge without persisting to localStorage.
   * Used by flows that keep the challenge in memory (ExchangeTokenSignInFlow)
   * so they don't overwrite the redirect flow's stored challenge.
   */
  const generateLocalChallenge = (): string => {
    return createChallengeString()
  }

  const getChallenge = (): string | null => {
    return localStorage.getItem(CHALLENGE_KEY)
  }

  const getChallengeUrl = (): string | null => {
    return localStorage.getItem(CHALLENGE_URL_KEY)
  }

  return {
    getChallenge,
    getChallengeUrl,
    generateChallenge,
    generateLocalChallenge
  }
}
