import type { Component, JSX } from 'solid-js'
import { For, createMemo, createSignal } from 'solid-js'
import { Chess, type Square as ChessSquare } from 'chess.js'
import { Chessboard } from 'src'
import type { PieceDropHandlerArgs, PieceRenderObject, SquareHandlerArgs } from 'src'

const PIECE_TYPES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']

const PIECE_SETS = [
  'alpha',
  'anarcandy',
  'caliente',
  'california',
  'cardinal',
  'cburnett',
  'celtic',
  'chess7',
  'chessnut',
  'companion',
  'cooke',
  'disguised',
  'dubrovny',
  'fantasy',
  'firi',
  'fresca',
  'gioco',
  'governor',
  'horsey',
  'icpieces',
  'kiwen-suwi',
  'kosal',
  'leipzig',
  'letter',
  'maestro',
  'merida',
  'minimal-warmth',
  'monarchy',
  'mono',
  'mpchess',
  'papercut',
  'pirouetti',
  'pixel',
  'reillycraig',
  'rhosgfx',
  'riohacha',
  'shahi-ivory-brown',
  'shapes',
  'spatial',
  'staunty',
  'tatiana',
  'totoy',
  'xkcd',
]

function buildPieceSet(set: string): PieceRenderObject {
  const pieces: PieceRenderObject = {}
  for (const t of PIECE_TYPES) {
    pieces[t] = () => (
      <img
        src={`/piece/${set}/${t}.svg`}
        alt={t}
        draggable={false}
        style={{ width: '100%', height: '100%', 'user-select': 'none' }}
      />
    )
  }
  return pieces
}

const App: Component = () => {
  // chess.js mutates in place, so the FEN string (not the instance) is the signal
  const chess = new Chess()
  const [position, setPosition] = createSignal(chess.fen())
  const [status, setStatus] = createSignal('White to move')

  // playground controls
  const [pieceSet, setPieceSet] = createSignal('default')
  const [lightColor, setLightColor] = createSignal('#F0D9B5')
  const [darkColor, setDarkColor] = createSignal('#B58863')

  // click-to-move selection + legal-target hints
  const [selected, setSelected] = createSignal<string | null>(null)
  const [hints, setHints] = createSignal<string[]>([])
  // hint squares occupied by an enemy piece (captures)
  const [captures, setCaptures] = createSignal<string[]>([])
  // square of the side-to-move king while in check
  const [checkSquare, setCheckSquare] = createSignal<string | null>(null)

  const clearSelection = () => {
    setSelected(null)
    setHints([])
    setCaptures([])
  }

  const select = (square: string) => {
    const moves = chess.moves({
      square: square as ChessSquare,
      verbose: true,
    })
    setSelected(square)
    setHints(moves.map(m => m.to))
    // verbose moves flag captures (including en passant) via `captured`
    setCaptures(moves.filter(m => m.captured).map(m => m.to))
  }

  const isOwnPiece = (piece: SquareHandlerArgs['piece']) =>
    !!piece && piece.pieceType[0] === chess.turn()

  // rebuilt only when the selected square, hints or check change
  const highlightStyles = createMemo(() => {
    const styles: Record<string, JSX.CSSProperties> = {}
    const sel = selected()
    if (sel) {
      styles[sel] = { 'background-color': 'rgba(255, 213, 79, 0.55)' }
      const caps = captures()
      for (const sq of hints()) {
        styles[sq] = caps.includes(sq)
          ? // capture: red ring, transparent center so the victim stays visible
            {
              background: 'radial-gradient(circle, transparent 72%, rgba(220, 38, 38, 0.8) 72%)',
            }
          : // quiet move: green dot
            {
              background: 'radial-gradient(circle, rgba(20, 85, 30, 0.55) 22%, transparent 22%)',
            }
      }
    }
    // check wins over everything: red tint behind the (still visible) king
    const chk = checkSquare()
    if (chk) styles[chk] = { 'background-color': 'rgba(255, 0, 0, 0.55)' }
    return styles
  })

  // rebuilt only when the selected set changes
  const pieces = createMemo(() =>
    pieceSet() === 'default' ? undefined : buildPieceSet(pieceSet()),
  )

  const refreshCheck = () => {
    if (!chess.isCheck()) {
      setCheckSquare(null)
      return
    }
    // locate the side-to-move king: board() already names every square
    const king = chess
      .board()
      .flat()
      .find(s => s?.type === 'k' && s?.color === chess.turn())
    setCheckSquare(king?.square ?? null)
  }

  const updateStatus = () => {
    refreshCheck()
    if (chess.isCheckmate()) {
      setStatus(`Checkmate — ${chess.turn() === 'w' ? 'Black' : 'White'} wins`)
    } else if (chess.isStalemate()) {
      setStatus('Stalemate — draw')
    } else if (chess.isDraw()) {
      setStatus('Draw')
    } else {
      setStatus(
        `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.isCheck() ? ' (check)' : ''}`,
      )
    }
  }

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!targetSquare) return false // dropped off-board
    try {
      chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      setPosition(chess.fen())
      updateStatus()
      clearSelection()
      return true
    } catch {
      return false // illegal move, piece snaps back
    }
  }

  const onSquareClick = ({ square, piece }: SquareHandlerArgs) => {
    const sel = selected()
    if (!sel) {
      // nothing selected: select a piece of the side to move
      if (isOwnPiece(piece)) select(square)
      return
    }
    if (square === sel) {
      clearSelection() // clicked the selected square again
      return
    }
    try {
      chess.move({ from: sel, to: square, promotion: 'q' })
      setPosition(chess.fen())
      updateStatus()
      clearSelection()
    } catch {
      // illegal target: reselect if it's another own piece, else deselect
      if (isOwnPiece(piece)) select(square)
      else clearSelection()
    }
  }

  const reset = () => {
    chess.reset()
    setPosition(chess.fen())
    updateStatus()
    clearSelection()
  }

  const undo = () => {
    chess.undo()
    setPosition(chess.fen())
    updateStatus()
    clearSelection()
  }

  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        gap: '12px',
        padding: '24px',
        'font-family': 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: '0', 'font-size': '20px' }}>solid-chessboard playground</h1>
      <p style={{ margin: '0' }}>{status()}</p>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          'align-items': 'center',
          'flex-wrap': 'wrap',
          'justify-content': 'center',
        }}
      >
        <label style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
          Pieces
          <select value={pieceSet()} onChange={e => setPieceSet(e.currentTarget.value)}>
            <option value="default">Default (built-in)</option>
            <For each={PIECE_SETS}>{set => <option value={set}>{set}</option>}</For>
          </select>
        </label>
        <label style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
          Light squares
          <input
            type="color"
            value={lightColor()}
            onInput={e => setLightColor(e.currentTarget.value)}
          />
        </label>
        <label style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
          Dark squares
          <input
            type="color"
            value={darkColor()}
            onInput={e => setDarkColor(e.currentTarget.value)}
          />
        </label>
      </div>
      <div style={{ width: 'min(90vw, 560px)' }}>
        <Chessboard
          options={{
            position: position(),
            onPieceDrop,
            onSquareClick,
            squareStyles: highlightStyles(),
            pieces: pieces(),
            lightSquareStyle: { 'background-color': lightColor() },
            darkSquareStyle: { 'background-color': darkColor() },
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={undo}>Undo</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

export default App
