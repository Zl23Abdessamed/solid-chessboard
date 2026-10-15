import { describe, expect, it } from 'vitest';
import {
  chessColumnToColumnIndex,
  chessRowToRowIndex,
  columnIndexToChessColumn,
  fenStringToPositionObject,
  generateBoard,
  getPositionUpdates,
  getPromotionUpdates,
  rowIndexToChessRow,
} from '../src/utils.js';

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

describe('generateBoard', () => {
  it('builds an 8x8 board in white orientation', () => {
    const board = generateBoard(8, 8, 'white');
    expect(board).toHaveLength(8);
    expect(board[0]).toHaveLength(8);
    expect(board[0]![0]!.squareId).toBe('a8');
    expect(board[7]![7]!.squareId).toBe('h1');
    expect(board[0]![0]!.isLightSquare).toBe(true);
  });

  it('flips square ids in black orientation', () => {
    const board = generateBoard(8, 8, 'black');
    expect(board[0]![0]!.squareId).toBe('h1');
    expect(board[7]![7]!.squareId).toBe('a8');
  });

  it('supports non-8x8 boards', () => {
    const board = generateBoard(4, 4, 'white');
    expect(board).toHaveLength(4);
    expect(board[0]![0]!.squareId).toBe('a4');
    expect(board[3]![3]!.squareId).toBe('d1');
  });
});

describe('row/column conversions', () => {
  it('round-trips white orientation', () => {
    for (let col = 0; col < 8; col++) {
      const chessCol = columnIndexToChessColumn(col, 8, 'white');
      expect(chessColumnToColumnIndex(chessCol, 8, 'white')).toBe(col);
    }
    expect(rowIndexToChessRow(0, 8, 'white')).toBe('8');
    expect(chessRowToRowIndex('1', 8, 'white')).toBe(7);
  });

  it('round-trips black orientation', () => {
    for (let col = 0; col < 8; col++) {
      const chessCol = columnIndexToChessColumn(col, 8, 'black');
      expect(chessColumnToColumnIndex(chessCol, 8, 'black')).toBe(col);
    }
    expect(rowIndexToChessRow(0, 8, 'black')).toBe('1');
    expect(chessRowToRowIndex('1', 8, 'black')).toBe(0);
    expect(chessRowToRowIndex('8', 8, 'black')).toBe(7);
  });
});

describe('fenStringToPositionObject', () => {
  it('parses the start position (32 pieces)', () => {
    const pos = fenStringToPositionObject(START_FEN, 8, 8);
    expect(Object.keys(pos)).toHaveLength(32);
    expect(pos['a8']?.pieceType).toBe('bR');
    expect(pos['e8']?.pieceType).toBe('bK');
    expect(pos['a1']?.pieceType).toBe('wR');
    expect(pos['e1']?.pieceType).toBe('wK');
    expect(pos['e2']?.pieceType).toBe('wP');
  });

  it('ignores extra FEN fields', () => {
    const pos = fenStringToPositionObject(
      `${START_FEN} w KQkq - 0 1`,
      8,
      8,
    );
    expect(Object.keys(pos)).toHaveLength(32);
  });

  it('parses partial positions', () => {
    const pos = fenStringToPositionObject('8/8/8/4k3/8/8/8/4K3', 8, 8);
    expect(Object.keys(pos)).toHaveLength(2);
    expect(pos['e5']?.pieceType).toBe('bK');
    expect(pos['e1']?.pieceType).toBe('wK');
  });
});

describe('getPositionUpdates', () => {
  it('detects a pawn push', () => {
    const before = fenStringToPositionObject(START_FEN, 8, 8);
    const after = fenStringToPositionObject(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      8,
      8,
    );
    expect(getPositionUpdates(before, after, 8, 'white')).toEqual({
      e2: 'e4',
    });
  });

  it('detects a knight move', () => {
    const before = fenStringToPositionObject(START_FEN, 8, 8);
    const after = fenStringToPositionObject(
      'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R',
      8,
      8,
    );
    expect(getPositionUpdates(before, after, 8, 'white')).toEqual({
      g1: 'f3',
    });
  });

  it('detects kingside castling as two moves', () => {
    const before = fenStringToPositionObject(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R',
      8,
      8,
    );
    const after = fenStringToPositionObject(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1RK1',
      8,
      8,
    );
    expect(getPositionUpdates(before, after, 8, 'white')).toEqual({
      e1: 'g1',
      h1: 'f1',
    });
  });
});

describe('getPromotionUpdates', () => {
  it('detects a pawn promotion', () => {
    const before = fenStringToPositionObject(
      '8/4P3/8/8/8/8/8/4K2k',
      8,
      8,
    );
    const after = fenStringToPositionObject('4Q3/8/8/8/8/8/8/4K2k', 8, 8);
    expect(getPromotionUpdates(before, after, 8, 8)).toEqual({
      e7: 'e8',
    });
  });
});
