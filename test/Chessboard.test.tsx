import { describe, expect, it } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Chessboard, defaultPieces } from '../src';

const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('Chessboard client render', () => {
  it('renders 64 squares and 32 pieces', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(() => <Chessboard />, container);
    await tick();
    expect(
      container.querySelectorAll('[id^="chessboard-square-"]'),
    ).toHaveLength(64);
    expect(container.querySelectorAll('[data-piece]')).toHaveLength(32);
    container.remove();
  });

  it('moves the pawn on position change (animation commits)', async () => {    const container = document.createElement('div');
    document.body.appendChild(container);
    const [fen, setFen] = createSignal(START_FEN);
    render(
      () => (
        <Chessboard options={{ position: fen(), onPieceDrop: () => true }} />
      ),
      container,
    );
    await tick();
    expect(
      container.querySelector('#chessboard-square-e2 [data-piece="wP"]'),
    ).toBeTruthy();

    setFen(E4_FEN);
    // animationDurationInMs (300) + margin for the commit timeout
    await new Promise<void>((resolve) => setTimeout(resolve, 450));

    expect(
      container.querySelector('#chessboard-square-e2 [data-piece]'),
    ).toBeNull();
    expect(
      container.querySelector('#chessboard-square-e4 [data-piece="wP"]'),
    ).toBeTruthy();
    container.remove();
  }, 10000);

  it('uses custom pieces and square colors', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      () => (
        <Chessboard
          options={{
            pieces: {
              ...defaultPieces,
              wP: () => (
                <img
                  src="/piece/alpha/wP.svg"
                  alt="wP"
                  style={{ width: '100%', height: '100%' }}
                />
              ),
            },
            lightSquareStyle: { 'background-color': 'rgb(255, 0, 0)' },
            darkSquareStyle: { 'background-color': 'rgb(0, 0, 255)' },
          }}
        />
      ),
      container,
    );
    await tick();
    // custom image piece overrides the default SVG for white pawns…
    const img = container.querySelector(
      '#chessboard-square-e2 img[src="/piece/alpha/wP.svg"]',
    );
    expect(img).toBeTruthy();
    // …while other pieces still use the built-in set
    expect(
      container.querySelector('#chessboard-square-e8 svg'),
    ).toBeTruthy();
    // custom square colors apply (a8 is light, a7 is dark)
    expect(
      (container.querySelector('#chessboard-square-a8') as HTMLElement)?.style
        .backgroundColor,
    ).toBe('rgb(255, 0, 0)');
    expect(
      (container.querySelector('#chessboard-square-a7') as HTMLElement)?.style
        .backgroundColor,
    ).toBe('rgb(0, 0, 255)');
    container.remove();
  });
});
