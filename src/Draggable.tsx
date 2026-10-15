import { createEffect } from 'solid-js'
import type { JSX } from 'solid-js'
import { useDraggable } from '@dnd-kit/solid'
import { useChessboardContext } from './ChessboardProvider.js'

type DraggableProps = {
  children: JSX.Element
  isSparePiece?: boolean
  pieceType: string
  position: string
}

export function Draggable(props: DraggableProps) {
  const ctx = useChessboardContext()

  const { ref, draggable } = useDraggable({
    id: props.position,
    data: {
      isSparePiece: props.isSparePiece ?? false,
      pieceType: props.pieceType,
    },
  })

  // Keep `disabled` reactive: `useDraggable` reads `input.disabled` once, so
  // sync the instance flag in an effect that tracks `allowDragging`.
  createEffect(() => {
    const allowDragging = ctx.options.allowDragging
    const canDragPiece = ctx.options.canDragPiece
    const disabled =
      !allowDragging ||
      (canDragPiece
        ? !canDragPiece({
            piece: { pieceType: props.pieceType },
            isSparePiece: props.isSparePiece ?? false,
            square: props.position,
          })
        : false)
    draggable.disabled = disabled
  })

  createEffect(() => {
    draggable.id = props.position
    draggable.data = {
      isSparePiece: props.isSparePiece ?? false,
      pieceType: props.pieceType,
    }
  })

  return <div ref={ref}>{props.children}</div>
}
