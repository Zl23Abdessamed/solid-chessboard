import { createEffect, createMemo, createSignal } from 'solid-js';
import type { JSX } from 'solid-js';
import { useChessboardContext } from './ChessboardProvider.js';
import type { DraggingPieceDataType, PieceDataType } from './types.js';
import {
  defaultDraggingPieceGhostStyle,
  defaultDraggingPieceStyle,
} from './defaults.js';

type PieceProps = {
  clone?: boolean;
  isSparePiece?: DraggingPieceDataType['isSparePiece'];
  position: DraggingPieceDataType['position'];
  pieceType: PieceDataType['pieceType'];
};

export function Piece(props: PieceProps) {
  const ctx = useChessboardContext();

  const [animationStyle, setAnimationStyle] =
    createSignal<JSX.CSSProperties>({});

  const cursor = createMemo(() => {
    if (props.clone) return 'grabbing';
    if (
      !ctx.options.allowDragging ||
      (ctx.options.canDragPiece &&
        !ctx.options.canDragPiece({
          piece: { pieceType: props.pieceType },
          isSparePiece: props.isSparePiece ?? false,
          square: props.position,
        }))
    ) {
      return 'pointer';
    }
    return 'grab';
  });

  // DOM measurement only runs in effects, never during SSR.
  createEffect(() => {
    const targetSquare = ctx.positionDifferences()[props.position];
    if (!targetSquare) {
      setAnimationStyle({});
      return;
    }

    if (typeof document === 'undefined') return;

    const sourceSquare = props.position;
    const squareWidth = document
      .querySelector(`#${ctx.options.id}-square-${sourceSquare}`)
      ?.getBoundingClientRect().width;

    if (!squareWidth) return;

    const orientation = ctx.options.boardOrientation;
    const duration = ctx.options.animationDurationInMs;

    setAnimationStyle({
      transform: `translate(${
        (orientation === 'black' ? -1 : 1) *
        (targetSquare.charCodeAt(0) - sourceSquare.charCodeAt(0)) *
        squareWidth
      }px, ${
        (orientation === 'black' ? -1 : 1) *
        (Number(sourceSquare[1]) - Number(targetSquare[1])) *
        squareWidth
      }px)`,
      transition: `transform ${duration}ms`,
      position: 'relative',
      'z-index': 10,
    });
  });

  return (
    <div
      id={`${ctx.options.id}-piece-${props.pieceType}-${props.position}`}
      data-piece={props.pieceType}
      style={{
        ...animationStyle(),
        ...(props.clone
          ? {
              ...defaultDraggingPieceStyle,
              ...ctx.options.draggingPieceStyle,
            }
          : {}),
        ...(!props.clone &&
        ctx.draggingPiece()?.position === props.position
          ? {
              ...defaultDraggingPieceGhostStyle,
              ...ctx.options.draggingPieceGhostStyle,
            }
          : {}),
        width: '100%',
        height: '100%',
        cursor: cursor(),
        'touch-action': 'none',
      }}
      onClick={() =>
        ctx.options.onPieceClick?.({
          isSparePiece: props.isSparePiece ?? false,
          piece: { pieceType: props.pieceType },
          square: props.position,
        })
      }
    >
      {(() => {
        const PieceSvg = ctx.options.pieces[props.pieceType];
        return PieceSvg ? <PieceSvg square={props.position} /> : null;
      })()}
    </div>
  );
}
