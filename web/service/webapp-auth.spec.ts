import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublic } from './base'
import { webAppLoginStatus } from './webapp-auth'

vi.mock('./base', () => ({
  getPublic: vi.fn(),
  postPublic: vi.fn(),
}))

describe('webAppLoginStatus', () => {
  beforeEach(() => {
    vi.mocked(getPublic).mockReset()
  })

  it('does not request login status when share code is missing', async () => {
    await expect(webAppLoginStatus(null)).resolves.toEqual({
      userLoggedIn: false,
      appLoggedIn: false,
    })
    await expect(webAppLoginStatus('')).resolves.toEqual({
      userLoggedIn: false,
      appLoggedIn: false,
    })

    expect(getPublic).not.toHaveBeenCalled()
  })
})
