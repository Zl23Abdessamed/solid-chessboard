import { PointerSensor } from '@dnd-kit/dom'
import type { Draggable } from '@dnd-kit/dom'
import type { PointerSensorOptions } from '@dnd-kit/dom'
import { configurator } from '@dnd-kit/abstract'

/**
 * A PointerSensor that cancels the active drag when the user right-clicks
 * mid-drag (contextmenu). This enables right-click-cancel of a drag while
 * right-drag still draws arrows (drag activation itself ignores button 2
 * via `preventActivation`, see ChessboardProvider).
 */
export class RightClickCancelSensor extends PointerSensor {
  // NOTE: `configure` must be re-declared here. The inherited static is bound
  // to the base PointerSensor and would silently instantiate that instead.
  static configure = configurator(RightClickCancelSensor)
  bind(source: Draggable, options?: PointerSensorOptions): () => void {
    const cleanup = super.bind(source, options)

    if (typeof window === 'undefined') return cleanup

    const handleContextMenu = (e: Event) => {
      // Cancel the active drag operation. `handleCancel` is protected on
      // PointerSensor; call through with a safe cast.
      ;(this as unknown as { handleCancel?: (event: Event) => void }).handleCancel?.(e)
    }

    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      cleanup()
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }
}
