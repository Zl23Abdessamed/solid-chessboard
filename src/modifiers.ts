import { Modifier, configurator } from '@dnd-kit/abstract';
import type { DragDropManager } from '@dnd-kit/dom';
import type { Coordinates } from '@dnd-kit/geometry';

export type PreventDragOffBoardOptions = {
  boardId: string;
  /** Getter returning the current dragging piece position (square id or spare piece type). */
  getDraggingPosition?: () => string;
};

/**
 * Clamps the drag transform so the piece centre stays within the board rect.
 * Used when `allowDragOffBoard === false`. Non-square positions (spare
 * pieces like `wP`) bypass clamping. Mirrors the React `preventDragOffBoard`
 * modifier behaviour against the new `@dnd-kit` Modifier API.
 */
export class PreventDragOffBoard extends Modifier<
  DragDropManager,
  PreventDragOffBoardOptions
> {
  static configure = configurator(PreventDragOffBoard);

  apply(operation: {
    transform: Coordinates;
  }): Coordinates {
    const { transform } = operation;
    const boardId = this.options?.boardId;
    const draggingPiecePosition =
      this.options?.getDraggingPosition?.() ?? '';

    if (typeof document === 'undefined' || !boardId) return transform;

    const boardElement = document.getElementById(`${boardId}-board`);
    if (!boardElement) return transform;

    const boardRect = boardElement.getBoundingClientRect();
    const a1Square = boardElement.querySelector(
      '[data-column="a"][data-row="1"]',
    );
    if (!a1Square) return transform;

    const squareWidth = a1Square.getBoundingClientRect().width;
    const halfSquareWidth = squareWidth / 2;

    const match = draggingPiecePosition.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) return transform;
    const [, col, row] = match;

    const startSquare = boardElement.querySelector(
      `[data-column="${col}"][data-row="${row}"]`,
    );
    if (!startSquare) return transform;

    const startSquareRect = startSquare.getBoundingClientRect();
    const startX = startSquareRect.left + halfSquareWidth - boardRect.left;
    const startY = startSquareRect.top + halfSquareWidth - boardRect.top;

    const minX = -startX;
    const maxX = boardRect.width - startX;
    const minY = -startY;
    const maxY = boardRect.height - startY;

    return {
      ...transform,
      x: Math.min(Math.max(transform.x, minX), maxX),
      y: Math.min(Math.max(transform.y, minY), maxY),
    };
  }
}

/**
 * Helper matching the React API shape: `preventDragOffBoard(boardId, position)`
 * returns a configured modifier descriptor for `DragDropProvider modifiers`.
 */
export const preventDragOffBoard = (
  boardId: string,
  draggingPiecePosition: string | (() => string),
) =>
  PreventDragOffBoard.configure({
    boardId,
    getDraggingPosition:
      typeof draggingPiecePosition === 'function'
        ? draggingPiecePosition
        : () => draggingPiecePosition,
  });
