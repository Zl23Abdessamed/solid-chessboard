import { describe, expect, it } from 'vitest';
import { isServer, renderToString } from 'solid-js/web';
import { Chessboard } from '../src';

describe('environment', () => {
  it('runs on server', () => {
    expect(typeof window).toBe('undefined');
    expect(isServer).toBe(true);
  });
});

describe('Chessboard SSR', () => {
  it('renders 64 squares and 32 pieces without touching window', () => {
    const html = renderToString(() => <Chessboard />);
    const squares = html.match(/id="chessboard-square-/g) ?? [];
    const pieces = html.match(/data-piece="/g) ?? [];
    expect(squares).toHaveLength(64);
    expect(pieces).toHaveLength(32);
  });
});
