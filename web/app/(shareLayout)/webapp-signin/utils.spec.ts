import { describe, expect, it } from 'vitest'
import { AccessMode } from '@/models/access-control'
import {
  getDecodedRedirectUrl,
  shouldUseConsoleSigninForLocalAppPermission,
} from './utils'

describe('shouldUseConsoleSigninForLocalAppPermission', () => {
  it('uses console signin for local private app permissions when enterprise webapp auth is disabled', () => {
    expect(shouldUseConsoleSigninForLocalAppPermission(false, AccessMode.SPECIFIC_GROUPS_MEMBERS)).toBe(true)
    expect(shouldUseConsoleSigninForLocalAppPermission(false, AccessMode.ORGANIZATION)).toBe(true)
  })

  it('does not use console signin for public access, external members, or enabled enterprise webapp auth', () => {
    expect(shouldUseConsoleSigninForLocalAppPermission(false, AccessMode.PUBLIC)).toBe(false)
    expect(shouldUseConsoleSigninForLocalAppPermission(false, AccessMode.EXTERNAL_MEMBERS)).toBe(false)
    expect(shouldUseConsoleSigninForLocalAppPermission(true, AccessMode.SPECIFIC_GROUPS_MEMBERS)).toBe(false)
  })
})

describe('getDecodedRedirectUrl', () => {
  it('decodes the original web app URL from webapp-signin redirect_url', () => {
    expect(getDecodedRedirectUrl('%2Fworkflow%2Fabc%3Ffoo%3Dbar')).toBe('/workflow/abc?foo=bar')
  })

  it('returns an empty string when redirect url is missing', () => {
    expect(getDecodedRedirectUrl(null)).toBe('')
  })
})
