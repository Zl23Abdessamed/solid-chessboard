import { Draggable } from './Draggable.js'
import { Piece } from './Piece.js'

type SparePieceProps = {
  pieceType: string
}

export function SparePiece(props: SparePieceProps) {
  return (
    <Draggable isSparePiece position={props.pieceType} pieceType={props.pieceType}>
      <Piece isSparePiece pieceType={props.pieceType} position={props.pieceType} />
    </Draggable>
  )
}
