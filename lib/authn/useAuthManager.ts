const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const CHALLENGE_KEY = 'speckle_challenge'

export function useAuthManager() {
  const generateChallenge = (): string => {
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    localStorage.setItem(CHALLENGE_KEY, result) // <-- persist it
    return result
  }

  const getChallenge = (): string | null => {
    return localStorage.getItem(CHALLENGE_KEY)
  }

  return {
    getChallenge,
    generateChallenge
  }
}
