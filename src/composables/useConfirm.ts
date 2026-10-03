import { shallowRef } from 'vue'

/** What to ask before an action the user can't take back. */
export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  /** Paints the confirm button as destructive. */
  destructive?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

const pending = shallowRef<PendingConfirm | null>(null)

/** Asks the user in an app dialog; resolves to true when they confirm. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  pending.value?.resolve(false)
  return new Promise((resolve) => {
    pending.value = { ...options, resolve }
  })
}

/** State for the single dialog host mounted in App. */
export function useConfirmHost() {
  function answer(ok: boolean) {
    pending.value?.resolve(ok)
    pending.value = null
  }
  return { pending, answer }
}
