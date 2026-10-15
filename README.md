<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=solid-chessboard&background=tiles&project=%20" alt="solid-chessboard">
</p>

# solid-chessboard

[![npm](https://img.shields.io/badge/maintained%20with-npm-cc00ff.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/)

A highly customizable, performant drag-and-drop chessboard component for SolidJS: based on react-chessboard

## Quick start

Install it:

```bash
npm i solid-chessboard
```

Use it:

```tsx
import { createSignal } from 'solid-js';
import { Chess } from 'chess.js';
import { Chessboard } from 'solid-chessboard';
import type { PieceDropHandlerArgs } from 'solid-chessboard';

function App() {
  // chess.js is mutable, so keep the FEN string (not the instance) in a signal
  const chess = new Chess();
  const [position, setPosition] = createSignal(chess.fen());

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!targetSquare) return false; // dropped off-board
    try {
      chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setPosition(chess.fen());
      return true;
    } catch {
      return false; // illegal move, piece snaps back
    }
  };

  return <Chessboard options={{ position: position(), onPieceDrop }} />;
}
```

## This project was created with the [Solid CLI](https://github.com/solidjs-community/solid-cli)
