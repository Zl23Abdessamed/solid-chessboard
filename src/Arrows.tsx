import { For } from 'solid-js'
import { createMemo } from 'solid-js'
import { useChessboardContext } from './ChessboardProvider.js'
import type { Arrow } from './types.js'
import { getRelativeCoords } from './utils.js'

export function Arrows() {
  const ctx = useChessboardContext()

  const viewBoxWidth = 2048
  const viewBoxHeight = () =>
    viewBoxWidth * (ctx.options.chessboardRows / ctx.options.chessboardColumns)

  const currentlyDrawingArrow = createMemo(() => {
    const start = ctx.newArrowStartSquare()
    const over = ctx.newArrowOverSquare()
    return start && over && start !== over.square
      ? {
          startSquare: start,
          endSquare: over.square,
          color: over.color,
        }
      : null
  })

  const arrowsToDraw = createMemo(() => {
    const drawing = currentlyDrawingArrow()
    return drawing
      ? [...ctx.options.arrows, ...ctx.internalArrows(), drawing]
      : [...ctx.options.arrows, ...ctx.internalArrows()]
  })

  const renderArrow = (arrow: Arrow, i: () => number) => {
    const from = () =>
      getRelativeCoords(
        ctx.options.boardOrientation,
        viewBoxWidth,
        ctx.options.chessboardColumns,
        ctx.options.chessboardRows,
        arrow.startSquare,
      )
    const to = () =>
      getRelativeCoords(
        ctx.options.boardOrientation,
        viewBoxWidth,
        ctx.options.chessboardColumns,
        ctx.options.chessboardRows,
        arrow.endSquare,
      )

    return (() => {
      // we want to shorten the arrow length so the tip of the arrow is more
      // central to the target square instead of running over the center
      const squareWidth = viewBoxWidth / ctx.options.chessboardColumns
      const arrowOptions = ctx.options.arrowOptions
      let lengthReducer = squareWidth / arrowOptions.arrowLengthReducerDenominator

      const drawing = currentlyDrawingArrow()
      const all = arrowsToDraw()
      const isArrowActive = !!drawing && i() === all.length - 1

      // if there are different arrows targeting the same square make their
      // length a bit shorter
      if (
        all.some(
          restArrow =>
            restArrow.startSquare !== arrow.startSquare && restArrow.endSquare === arrow.endSquare,
        ) &&
        !isArrowActive
      ) {
        lengthReducer = squareWidth / arrowOptions.sameTargetArrowLengthReducerDenominator
      }

      // Calculate the difference in x and y coordinates between start and end
      const dx = to().x - from().x
      const dy = to().y - from().y

      // Total distance center to center via Pythagorean theorem
      const r = Math.hypot(dy, dx)

      // Distance to offset the arrow start from the square center
      const startOffset = squareWidth * arrowOptions.arrowStartOffset

      let pathD: string

      // Knight move - draw an L-shaped arrow
      if (r === Math.hypot(1, 2) * squareWidth) {
        // Determine which direction to draw the long leg first
        const isVerticalFirst = Math.abs(dx) < Math.abs(dy)

        // Offset start point in the direction of the first leg
        const start = isVerticalFirst
          ? { x: from().x, y: from().y + Math.sign(dy) * startOffset }
          : { x: from().x + Math.sign(dx) * startOffset, y: from().y }

        // Corner where the L-shape turns
        const corner = isVerticalFirst ? { x: from().x, y: to().y } : { x: to().x, y: from().y }

        // Calculate the final leg from corner to target
        const dxFinalLeg = to().x - corner.x
        const dyFinalLeg = to().y - corner.y
        const finalLegLength = squareWidth // Always one square for knight moves

        // Shorten the final leg so the arrow stops before the target center
        const end = {
          x: corner.x + (dxFinalLeg * (finalLegLength - lengthReducer)) / finalLegLength,
          y: corner.y + (dyFinalLeg * (finalLegLength - lengthReducer)) / finalLegLength,
        }

        pathD = `M${start.x},${start.y} L${corner.x},${corner.y} L${end.x},${end.y}`
      } else {
        // Straight arrow - offset start point toward the target
        const start = {
          x: from().x + (dx * startOffset) / r,
          y: from().y + (dy * startOffset) / r,
        }

        // Shorten the arrow so it stops before the target center
        const end = {
          x: from().x + (dx * (r - lengthReducer)) / r,
          y: from().y + (dy * (r - lengthReducer)) / r,
        }

        pathD = `M${start.x},${start.y} L${end.x},${end.y}`
      }

      const markerId = () =>
        `${ctx.options.id}-arrowhead-${i()}-${arrow.startSquare}-${arrow.endSquare}`

      return (
        <>
          <marker
            id={markerId()}
            markerWidth="2"
            markerHeight="2.5"
            refX="1.25"
            refY="1.25"
            orient="auto"
          >
            <polygon points="0.3 0, 2 1.25, 0.3 2.5" fill={arrow.color} />
          </marker>
          <path
            d={pathD}
            fill="none"
            opacity={isArrowActive ? arrowOptions.activeOpacity : arrowOptions.opacity}
            stroke={arrow.color}
            stroke-width={
              isArrowActive
                ? arrowOptions.activeArrowWidthMultiplier *
                  (squareWidth / arrowOptions.arrowWidthDenominator)
                : squareWidth / arrowOptions.arrowWidthDenominator
            }
            marker-end={`url(#${markerId()})`}
          />
        </>
      )
    })()
  }

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight()}`}
      style={{
        position: 'absolute',
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        'pointer-events': 'none',
        'z-index': '20',
      }}
    >
      <For each={arrowsToDraw()}>{(arrow, i) => renderArrow(arrow, i)}</For>
    </svg>
  )
}
