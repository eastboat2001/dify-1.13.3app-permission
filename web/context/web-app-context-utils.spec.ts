import { describe, expect, it } from 'vitest'
import {
  getShareCodeFromPathname,
  getShareCodeFromRedirectUrl,
} from './web-app-context-utils'

describe('getShareCodeFromPathname', () => {
  it('returns app code from supported web app routes', () => {
    expect(getShareCodeFromPathname('/workflow/BEUkWHxFf1ojX3Ul')).toBe('BEUkWHxFf1ojX3Ul')
    expect(getShareCodeFromPathname('/chat/app-code')).toBe('app-code')
    expect(getShareCodeFromPathname('/completion/app-code')).toBe('app-code')
  })

  it('does not treat console routes as web app codes', () => {
    expect(getShareCodeFromPathname('/signin')).toBeNull()
    expect(getShareCodeFromPathname('/apps')).toBeNull()
    expect(getShareCodeFromPathname('/account')).toBeNull()
  })
})

describe('getShareCodeFromRedirectUrl', () => {
  it('returns app code from a supported web app redirect URL', () => {
    expect(getShareCodeFromRedirectUrl('%2Fworkflow%2FBEUkWHxFf1ojX3Ul', 'http://localhost:3000')).toBe(
      'BEUkWHxFf1ojX3Ul',
    )
  })

  it('does not return a code from a console redirect URL', () => {
    expect(getShareCodeFromRedirectUrl('%2Fsignin', 'http://localhost:3000')).toBeNull()
  })
})
