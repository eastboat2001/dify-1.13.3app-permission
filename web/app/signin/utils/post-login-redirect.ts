let postLoginRedirect: string | null = null
const POST_LOGIN_REDIRECT_STORAGE_KEY = 'dify-post-login-redirect'

const getSessionStorage = () => {
  if (typeof globalThis === 'undefined' || !globalThis.sessionStorage)
    return null

  return globalThis.sessionStorage
}

export const setPostLoginRedirect = (value: string | null) => {
  postLoginRedirect = value
  const storage = getSessionStorage()
  if (!storage)
    return

  if (value)
    storage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, value)
  else
    storage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
}

export const resolvePostLoginRedirect = () => {
  if (postLoginRedirect) {
    const redirectUrl = postLoginRedirect
    postLoginRedirect = null
    getSessionStorage()?.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
    return redirectUrl
  }

  const storedRedirectUrl = getSessionStorage()?.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
  if (storedRedirectUrl) {
    getSessionStorage()?.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
    return storedRedirectUrl
  }

  return null
}
