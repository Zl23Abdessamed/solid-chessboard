import { For, Show } from 'solid-js'
import { DragOverlay } from '@dnd-kit/solid'
import { Arrows } from './Arrows.js'
import { Draggable } from './Draggable.js'
import { Droppable } from './Droppable.js'
import { Piece } from './Piece.js'
import { Square } from './Square.js'
import { useChessboardContext } from './ChessboardProvider.js'
import { defaultBoardStyle } from './defaults.js'

export function Board() {
  const ctx = useChessboardContext()

  return (
    <>
      <div
        id={`${ctx.options.id}-board`}
        style={{
          ...defaultBoardStyle(ctx.options.chessboardColumns),
          ...ctx.options.boardStyle,
        }}
      >
        <For each={ctx.board()}>
          {row => (
            <For each={row}>
              {square => (
                <Droppable squareId={square.squareId}>
                  {({ isOver }) => (
                    <Square
                      squareId={square.squareId}
                      isLightSquare={square.isLightSquare}
                      isOver={isOver}
                    >
                      <Show when={ctx.currentPosition()[square.squareId]}>
                        {piece => (
                          <Draggable
                            isSparePiece={false}
                            position={square.squareId}
                            pieceType={piece().pieceType}
                          >
                            <Piece position={square.squareId} pieceType={piece().pieceType} />
                          </Draggable>
                        )}
                      </Show>
                    </Square>
                  )}
                </Droppable>
              )}
            </For>
          )}
        </For>

        <Arrows />
      </div>

      <DragOverlay dropAnimation={null}>
        <Show when={ctx.draggingPiece()}>
          {dragging => (
            <Piece clone position={dragging().position} pieceType={dragging().pieceType} />
          )}
        </Show>
      </DragOverlay>
    </>
  )
}
