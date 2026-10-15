import { Show } from 'solid-js';
import type { Accessor, JSX } from 'solid-js';
import { createEffect, createSignal } from 'solid-js';
import { useChessboardContext } from './ChessboardProvider.js';
import {
  defaultAlphaNotationStyle,
  defaultDarkSquareNotationStyle,
  defaultDarkSquareStyle,
  defaultDropSquareStyle,
  defaultLightSquareNotationStyle,
  defaultLightSquareStyle,
  defaultNumericNotationStyle,
  defaultSquareStyle,
} from './defaults.js';
import { columnIndexToChessColumn, isTouchEndWithinSquare } from './utils.js';

type SquareProps = {
  children?: JSX.Element;
  squareId: string;
  isLightSquare: boolean;
  /**
   * Whether a dragged piece is currently over this square. Accepts a plain
   * boolean or a reactive accessor (as provided by `Droppable`). The
   * accessor form keeps the `Square` instance stable across hover changes so
   * local state (arrow drawing, tap detection) is preserved and drag-aware
   * hover callbacks fire on transitions instead of remounts.
   */
  isOver: boolean | Accessor<boolean>;
};

export function Square(props: SquareProps) {
  // track if we are drawing an arrow so that onSquareRightClick is not fired
  // when we finish drawing an arrow
  const [isDrawingArrow, setIsDrawingArrow] = createSignal(false);
  const [isClickingOnMobile, setIsClickingOnMobile] = createSignal(false);

  const ctx = useChessboardContext();

  const isOver = () =>
    typeof props.isOver === 'function' ? props.isOver() : props.isOver;

  // track previous isOver to only fire onMouseOutSquare on transition
  let prevIsOver = false;

  // handle firing onMouseOverSquare and onMouseOutSquare during drag
  // operations as onMouseOver and onMouseLeave do not fire during dragging
  createEffect(() => {
    const over = isOver();
    const dragging = ctx.draggingPiece();
    // read position reactively so callbacks always see the latest piece
    const position = ctx.currentPosition();
    if (over && dragging) {
      ctx.options.onMouseOverSquare?.({
        piece: position[props.squareId] ?? null,
        square: props.squareId,
      });
    } else if (!over && dragging && prevIsOver) {
      ctx.options.onMouseOutSquare?.({
        piece: position[props.squareId] ?? null,
        square: props.squareId,
      });
    }
    prevIsOver = over;
  });

  // if we are dragging a piece, we are no longer clicking on mobile as that
  // is a drag operation, so reset the clicking on mobile state
  createEffect(() => {
    if (ctx.draggingPiece() && isClickingOnMobile()) {
      setIsClickingOnMobile(false);
    }
  });

  const column = () => props.squareId.match(/^[a-z]+/)?.[0];
  const row = () => props.squareId.match(/\d+$/)?.[0];

  return (
    <div
      id={`${ctx.options.id}-square-${props.squareId}`}
      style={{
        ...defaultSquareStyle,
        ...ctx.options.squareStyle,
        ...(props.isLightSquare
          ? {
              ...defaultLightSquareStyle,
              ...ctx.options.lightSquareStyle,
            }
          : { ...defaultDarkSquareStyle, ...ctx.options.darkSquareStyle }),
        ...(isOver()
          ? { ...defaultDropSquareStyle, ...ctx.options.dropSquareStyle }
          : {}),
      }}
      data-column={column()}
      data-row={row()}
      data-square={props.squareId}
      onClick={(e) => {
        if (e.button === 0) {
          ctx.options.onSquareClick?.({
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          });
        }
      }}
      onTouchStart={() => {
        // in order to prevent onTouchEnd from firing if we are dragging within
        // the same square, we need to store if a touch has started so that we
        // can reset it if we drag, and if it isn't reset by the time the touch
        // ends, we know it was a tap and can fire the click event
        setIsClickingOnMobile(true);
      }}
      onTouchEnd={(e) => {
        // Prevent default to avoid double-firing with onClick on some devices
        e.preventDefault();

        // we only want to fire onSquareClick if the touch event ended within
        // the same square as it started
        const within = isTouchEndWithinSquare(
          ctx.options.id,
          props.squareId,
          e,
        );

        if (within && isClickingOnMobile()) {
          ctx.options.onSquareClick?.({
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          });
        }
        setIsClickingOnMobile(false);
      }}
      onContextMenu={(e) => {
        e.preventDefault();

        if (!isDrawingArrow()) {
          ctx.options.onSquareRightClick?.({
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          });
        }
        setIsDrawingArrow(false);
      }}
      onMouseDown={(e) => {
        if (e.button === 0) {
          ctx.clearArrows();
        }
        if (e.button === 2 && ctx.options.allowDrawingArrows) {
          ctx.setNewArrowStartSquare(props.squareId);
        }
        ctx.options.onSquareMouseDown?.(
          {
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          },
          e,
        );
      }}
      onMouseUp={(e) => {
        if (e.button === 2) {
          if (
            ctx.options.allowDrawingArrows &&
            ctx.newArrowStartSquare() &&
            ctx.newArrowStartSquare() !== props.squareId
          ) {
            setIsDrawingArrow(true);
            ctx.drawArrow(props.squareId, {
              shiftKey: e.shiftKey,
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              metaKey: e.metaKey,
            });
          } else if (ctx.newArrowStartSquare() === props.squareId) {
            // right clicked the same square - clear the arrow start square
            ctx.setNewArrowStartSquare(null);
            ctx.setNewArrowOverSquare(null);
          }
        }
        ctx.options.onSquareMouseUp?.(
          {
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          },
          e,
        );
      }}
      onMouseOver={(e) => {
        // right mouse button is held down and we are drawing an arrow
        if (
          e.buttons === 2 &&
          ctx.options.allowDrawingArrows &&
          ctx.newArrowStartSquare() &&
          ctx.newArrowStartSquare() !== props.squareId
        ) {
          ctx.setNewArrowOverSquare(props.squareId, {
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
          });
        } else if (ctx.newArrowStartSquare() === props.squareId) {
          // hovering back over the starting square - clear the over square
          ctx.setNewArrowOverSquare(null);
        }

        // don't fire when dragging as that is handled by the effect above
        if (!ctx.draggingPiece()) {
          ctx.options.onMouseOverSquare?.({
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          });
        }
      }}
      onMouseLeave={() => {
        // don't fire when dragging as that is handled by the effect above
        if (!ctx.draggingPiece()) {
          ctx.options.onMouseOutSquare?.({
            piece: ctx.currentPosition()[props.squareId] ?? null,
            square: props.squareId,
          });
        }
      }}
    >
      <Show when={ctx.options.showNotation}>
        <span
          style={
            props.isLightSquare
              ? {
                  ...defaultLightSquareNotationStyle,
                  ...ctx.options.lightSquareNotationStyle,
                }
              : {
                  ...defaultDarkSquareNotationStyle,
                  ...ctx.options.darkSquareNotationStyle,
                }
          }
        >
          <Show
            when={
              row() ===
              (ctx.options.boardOrientation === 'white'
                ? '1'
                : ctx.options.chessboardRows.toString())
            }
          >
            <span
              style={{
                ...defaultAlphaNotationStyle,
                ...ctx.options.alphaNotationStyle,
              }}
            >
              {column()}
            </span>
          </Show>
          <Show
            when={
              column() ===
              (ctx.options.boardOrientation === 'white'
                ? 'a'
                : columnIndexToChessColumn(
                    0,
                    ctx.options.chessboardColumns,
                    ctx.options.boardOrientation,
                  ))
            }
          >
            <span
              style={{
                ...defaultNumericNotationStyle,
                ...ctx.options.numericNotationStyle,
              }}
            >
              {row()}
            </span>
          </Show>
        </span>
      </Show>

      {ctx.options.squareRenderer?.({
        piece: ctx.currentPosition()[props.squareId] ?? null,
        square: props.squareId,
        children: props.children,
      }) || (
        <div
          style={{
            width: '100%',
            height: '100%',
            ...ctx.options.squareStyles[props.squareId],
          }}
        >
          {props.children}
        </div>
      )}
    </div>
  );
}
