import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('post login redirect', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.resetModules()
  })

  it('persists redirect across module reloads', async () => {
    const firstModule = await import('./post-login-redirect')
    firstModule.setPostLoginRedirect('/workflow/app-code')

    vi.resetModules()
    const secondModule = await import('./post-login-redirect')

    expect(secondModule.resolvePostLoginRedirect()).toBe('/workflow/app-code')
    expect(secondModule.resolvePostLoginRedirect()).toBeNull()
  })
})
