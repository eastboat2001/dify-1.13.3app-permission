const WEB_APP_ROUTE_NAMES = new Set(['chat', 'chatbot', 'completion', 'workflow'])

export const getShareCodeFromPathname = (pathname: string): string | null => {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2)
    return null

  const [routeName, shareCode] = segments
  if (!WEB_APP_ROUTE_NAMES.has(routeName) || !shareCode)
    return null

  return shareCode
}

export const getShareCodeFromRedirectUrl = (
  redirectUrl: string | null,
  origin: string,
): string | null => {
  if (!redirectUrl)
    return null

  try {
    const url = new URL(decodeURIComponent(redirectUrl), origin)
    return getShareCodeFromPathname(url.pathname)
  }
  catch {
    return null
  }
}
