const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CHALLENGE_KEY = 'speckle_challenge'
const CHALLENGE_URL_KEY = 'speckle_url_challenge'

export function useAuthManager() {
  const generateChallenge = (url: string): string => {
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    localStorage.setItem(CHALLENGE_KEY, result) // <-- persist it
    localStorage.setItem(CHALLENGE_URL_KEY, url)
    return result
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
    generateChallenge
  }
}
