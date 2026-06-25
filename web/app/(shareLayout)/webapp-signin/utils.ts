import { AccessMode } from '@/models/access-control'

export const shouldUseConsoleSigninForLocalAppPermission = (
  webappAuthEnabled: boolean,
  accessMode: AccessMode,
) => {
  if (webappAuthEnabled)
    return false

  return accessMode === AccessMode.SPECIFIC_GROUPS_MEMBERS || accessMode === AccessMode.ORGANIZATION
}

export const getDecodedRedirectUrl = (redirectUrl: string | null) => {
  if (!redirectUrl)
    return ''

  try {
    return decodeURIComponent(redirectUrl)
  }
  catch {
    return redirectUrl
  }
}
