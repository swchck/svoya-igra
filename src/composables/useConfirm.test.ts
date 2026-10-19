import { describe, expect, it } from 'vitest'
import { confirmAction, dismissConfirm, useConfirmHost } from './useConfirm'

describe('confirmAction', () => {
  it('declines a question left open when its page goes away', async () => {
    const asked = confirmAction({ title: 'Продолжить?' })
    dismissConfirm()
    await expect(asked).resolves.toBe(false)
    expect(useConfirmHost().pending.value).toBeNull()
  })
})
