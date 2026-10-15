import { describe, expect, it } from 'vitest';
import {
  Chessboard,
  ChessboardProvider,
  SparePiece,
  defaultArrowOptions,
  defaultPieces,
  fenStringToPositionObject,
  generateBoard,
  getPositionUpdates,
} from '../src';

describe('public barrel', () => {
  it('exports the board components', () => {
    expect(typeof Chessboard).toBe('function');
    expect(typeof ChessboardProvider).toBe('function');
    expect(typeof SparePiece).toBe('function');
  });

  it('exports defaults, pieces and utils', () => {
    expect(Object.keys(defaultPieces).sort()).toEqual(
      [
        'bB',
        'bK',
        'bN',
        'bP',
        'bQ',
        'bR',
        'wB',
        'wK',
        'wN',
        'wP',
        'wQ',
        'wR',
      ].sort(),
    );
    expect(defaultArrowOptions.opacity).toBe(0.65);
    expect(typeof generateBoard).toBe('function');
    expect(typeof fenStringToPositionObject).toBe('function');
    expect(typeof getPositionUpdates).toBe('function');
  });
});
