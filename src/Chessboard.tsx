import { createMemo } from 'solid-js'
import { Board } from './Board.js'
import { ChessboardProvider, useChessboardContext } from './ChessboardProvider.js'
import type { ChessboardOptions } from './ChessboardProvider.js'

type ChessboardProps = {
  options?: ChessboardOptions
}

export function Chessboard(props: ChessboardProps) {
  const ctx = useChessboardContext() as unknown as {
    isWrapped?: boolean
  } | null

  // Re-spread into a memo so the forwarded object stays reactive: `props`
  // are read once per access through this memo instead of being snapshotted
  // as a plain object (component setup runs exactly once).
  const forwarded = createMemo(() => ({ ...props.options }))

  if (ctx?.isWrapped) {
    return <Board />
  }

  return (
    <ChessboardProvider options={forwarded()}>
      <Board />
    </ChessboardProvider>
  )
}
