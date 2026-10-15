import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  untrack,
  useContext,
} from 'solid-js';
import type { Accessor, JSX } from 'solid-js';
import {
  DragDropProvider,
  KeyboardSensor,
} from '@dnd-kit/solid';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/abstract';
import { AutoScroller, PointerActivationConstraints } from '@dnd-kit/dom';
import {
  fenStringToPositionObject,
  generateBoard,
  getPositionUpdates,
  getPromotionUpdates,
} from './utils.js';
import type {
  Arrow,
  ArrowModifiers,
  DraggingPieceDataType,
  PieceDropHandlerArgs,
  PieceHandlerArgs,
  PieceRenderObject,
  PositionDataType,
  SquareHandlerArgs,
  SquareRenderer,
} from './types.js';
import { defaultPieces } from './pieces.js';
import {
  defaultAlphaNotationStyle,
  defaultArrowOptions,
  defaultDarkSquareNotationStyle,
  defaultDarkSquareStyle,
  defaultDraggingPieceGhostStyle,
  defaultDraggingPieceStyle,
  defaultDropSquareStyle,
  defaultLightSquareNotationStyle,
  defaultLightSquareStyle,
  defaultNumericNotationStyle,
  defaultSquareStyle,
} from './defaults.js';
import { RightClickCancelSensor } from './RightClickCancelSensor.js';
import { preventDragOffBoard } from './modifiers.js';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

export type ChessboardOptions = {
  // id
  id?: string;

  // pieces and position
  pieces?: PieceRenderObject;
  position?: string | PositionDataType;

  // board dimensions and orientation
  boardOrientation?: 'white' | 'black';
  chessboardRows?: number;
  chessboardColumns?: number;

  // board and squares styles
  boardStyle?: JSX.CSSProperties;
  squareStyle?: JSX.CSSProperties;
  squareStyles?: Record<string, JSX.CSSProperties>;
  darkSquareStyle?: JSX.CSSProperties;
  lightSquareStyle?: JSX.CSSProperties;
  dropSquareStyle?: JSX.CSSProperties;
  draggingPieceStyle?: JSX.CSSProperties;
  draggingPieceGhostStyle?: JSX.CSSProperties;

  // notation
  darkSquareNotationStyle?: JSX.CSSProperties;
  lightSquareNotationStyle?: JSX.CSSProperties;
  alphaNotationStyle?: JSX.CSSProperties;
  numericNotationStyle?: JSX.CSSProperties;
  showNotation?: boolean;

  // animation
  animationDurationInMs?: number;
  showAnimations?: boolean;

  // drag and drop
  allowDragging?: boolean;
  allowDragOffBoard?: boolean;
  allowAutoScroll?: boolean;
  dragActivationDistance?: number;

  // arrows
  allowDrawingArrows?: boolean;
  arrows?: Arrow[];
  arrowOptions?: typeof defaultArrowOptions;
  clearArrowsOnClick?: boolean;
  clearArrowsOnPositionChange?: boolean;

  // handlers
  canDragPiece?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => boolean;
  onArrowsChange?: ({ arrows }: { arrows: Arrow[] }) => void;
  onMouseOutSquare?: ({ piece, square }: SquareHandlerArgs) => void;
  onMouseOverSquare?: ({ piece, square }: SquareHandlerArgs) => void;
  onPieceClick?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => void;
  onPieceDrag?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => void;
  onPieceDragCancel?: () => void;
  onPieceDrop?: ({
    piece,
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs) => boolean;
  onSquareClick?: ({ piece, square }: SquareHandlerArgs) => void;
  onSquareMouseDown?: (
    { piece, square }: SquareHandlerArgs,
    e: MouseEvent,
  ) => void;
  onSquareMouseUp?: (
    { piece, square }: SquareHandlerArgs,
    e: MouseEvent,
  ) => void;
  onSquareRightClick?: ({ piece, square }: SquareHandlerArgs) => void;
  squareRenderer?: SquareRenderer;
};

/** Callbacks that remain optional after defaults are merged in. */
type OptionalCallbackKeys =
  | 'canDragPiece'
  | 'onArrowsChange'
  | 'onMouseOutSquare'
  | 'onMouseOverSquare'
  | 'onPieceClick'
  | 'onPieceDrag'
  | 'onPieceDragCancel'
  | 'onPieceDrop'
  | 'onSquareClick'
  | 'onSquareMouseDown'
  | 'onSquareMouseUp'
  | 'onSquareRightClick'
  | 'squareRenderer';

export type ResolvedChessboardOptions = Omit<
  Required<ChessboardOptions>,
  OptionalCallbackKeys
> &
  Pick<ChessboardOptions, OptionalCallbackKeys>;

export type ChessboardContextType = {
  // resolved options (reactive getters produced by mergeProps).
  // Style/geometry fields are always defined via defaults; callbacks stay
  // optional as in `ChessboardOptions` (nothing invokes them when absent).
  options: ResolvedChessboardOptions;

  // live state (accessors)
  isWrapped: true;
  board: Accessor<SquareDataType[][]>;
  currentPosition: Accessor<PositionDataType>;
  draggingPiece: Accessor<DraggingPieceDataType | null>;
  positionDifferences: Accessor<Record<string, string>>;
  newArrowStartSquare: Accessor<string | null>;
  newArrowOverSquare: Accessor<{ square: string; color: string } | null>;
  internalArrows: Accessor<Arrow[]>;

  // actions
  setNewArrowStartSquare: (square: string | null) => void;
  setNewArrowOverSquare: (
    square: string | null,
    modifiers?: ArrowModifiers,
  ) => void;
  drawArrow: (endSquare: string, modifiers?: ArrowModifiers) => void;
  clearArrows: () => void;
};

type SquareDataType = {
  squareId: string;
  isLightSquare: boolean;
};

const ChessboardContext = createContext<ChessboardContextType | null>(null);

export function useChessboardContext() {
  return useContext(ChessboardContext) as ChessboardContextType;
}

export function ChessboardProvider(props: {
  children: JSX.Element;
  options?: ChessboardOptions;
}) {
  // NOTE: the source is a function (not a plain object) so `mergeProps`
  // memoizes it and re-reads `props.options` on every access. A plain-object
  // source would freeze the first `position` forever, since component setup
  // (including this `mergeProps` call) runs exactly once.
  const options = mergeProps(
    {
      id: 'chessboard',
      pieces: defaultPieces,
      position: START_FEN,
      boardOrientation: 'white',
      chessboardRows: 8,
      chessboardColumns: 8,
      boardStyle: {},
      squareStyle: defaultSquareStyle,
      squareStyles: {},
      darkSquareStyle: defaultDarkSquareStyle,
      lightSquareStyle: defaultLightSquareStyle,
      dropSquareStyle: defaultDropSquareStyle,
      draggingPieceStyle: defaultDraggingPieceStyle,
      draggingPieceGhostStyle: defaultDraggingPieceGhostStyle,
      darkSquareNotationStyle: defaultDarkSquareNotationStyle,
      lightSquareNotationStyle: defaultLightSquareNotationStyle,
      alphaNotationStyle: defaultAlphaNotationStyle,
      numericNotationStyle: defaultNumericNotationStyle,
      showNotation: true,
      animationDurationInMs: 300,
      showAnimations: true,
      allowDragging: true,
      allowDragOffBoard: true,
      allowAutoScroll: false,
      dragActivationDistance: 1,
      allowDrawingArrows: true,
      arrows: [],
      arrowOptions: defaultArrowOptions,
      clearArrowsOnClick: true,
      clearArrowsOnPositionChange: true,
    } as unknown as ResolvedChessboardOptions,
    () => props.options ?? {},
  ) as ResolvedChessboardOptions;

  const toPositionObject = (pos: string | PositionDataType) =>
    typeof pos === 'string'
      ? fenStringToPositionObject(
          pos,
          options.chessboardRows,
          options.chessboardColumns,
        )
      : pos;

  // the piece currently being dragged
  const [draggingPiece, setDraggingPiece] =
    createSignal<DraggingPieceDataType | null>(null);

  // the current position of pieces on the chessboard
  const [currentPosition, setCurrentPosition] = createSignal<PositionDataType>(
    toPositionObject(untrack(() => options.position)),
  );

  // calculated differences between current and incoming positions
  const [positionDifferences, setPositionDifferences] = createSignal<
    Record<string, string>
  >({});

  // if the latest move was a manual drop
  const [manuallyDroppedPieceAndSquare, setManuallyDroppedPieceAndSquare] =
    createSignal<{
      piece: string;
      sourceSquare: string;
      targetSquare: string;
    } | null>(null);

  // arrows
  const [newArrowStartSquare, setNewArrowStartSquare] =
    createSignal<string | null>(null);
  const [newArrowOverSquare, setNewArrowOverSquare] = createSignal<{
    square: string;
    color: string;
  } | null>(null);
  const [internalArrows, setInternalArrows] = createSignal<Arrow[]>([]);

  // position we are animating to
  const [waitingForAnimationPosition, setWaitingForAnimationPosition] =
    createSignal<PositionDataType | null>(null);

  // only redraw the board when the dimensions or board orientation change
  const board = createMemo(() =>
    generateBoard(
      options.chessboardRows,
      options.chessboardColumns,
      options.boardOrientation,
    ),
  );

  const resolveArrowColor = (modifiers?: ArrowModifiers) => {
    const arrowOptions = options.arrowOptions;
    // `colors` ships in the defaults, but the legacy shape
    // (color/secondaryColor/tertiaryColor without `colors`) is still accepted
    // at runtime, so this check is intentional.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (arrowOptions.colors) {
      if (modifiers?.altKey && arrowOptions.colors.alt)
        return arrowOptions.colors.alt;
      if (modifiers?.shiftKey && arrowOptions.colors.shift)
        return arrowOptions.colors.shift;
      if (modifiers?.ctrlKey && arrowOptions.colors.ctrl)
        return arrowOptions.colors.ctrl;
      if (modifiers?.metaKey && arrowOptions.colors.meta)
        return arrowOptions.colors.meta;
      return arrowOptions.colors.default || arrowOptions.color;
    }
    // legacy fallback
    return modifiers?.shiftKey
      ? arrowOptions.secondaryColor
      : modifiers?.ctrlKey
        ? arrowOptions.tertiaryColor
        : arrowOptions.color;
  };

  const drawArrow = (newArrowEndSquare: string, modifiers?: ArrowModifiers) => {
    if (!options.allowDrawingArrows) return;
    const start = newArrowStartSquare();
    if (!start || start === newArrowEndSquare) return;

    const externalArrows = options.arrows;
    const current = internalArrows();

    const arrowExistsIndex = current.findIndex(
      (arrow) =>
        arrow.startSquare === start && arrow.endSquare === newArrowEndSquare,
    );
    const arrowExistsExternally = externalArrows.some(
      (arrow) =>
        arrow.startSquare === start && arrow.endSquare === newArrowEndSquare,
    );

    // if the arrow already exists externally, don't add it internally
    if (arrowExistsExternally) {
      setNewArrowStartSquare(null);
      setNewArrowOverSquare(null);
      return;
    }

    const arrowColor = resolveArrowColor(modifiers);
    setInternalArrows((prev) =>
      arrowExistsIndex === -1
        ? [
            ...prev,
            {
              startSquare: start,
              endSquare: newArrowEndSquare,
              color: arrowColor,
            },
          ]
        : prev.filter((_, index) => index !== arrowExistsIndex),
    );
    setNewArrowStartSquare(null);
    setNewArrowOverSquare(null);
  };

  const clearArrows = () => {
    if (options.clearArrowsOnClick) {
      setInternalArrows([]);
      setNewArrowStartSquare(null);
      setNewArrowOverSquare(null);
    }
  };

  const setNewArrowOverSquareWithModifiers = (
    square: string | null,
    modifiers?: ArrowModifiers,
  ) => {
    if (square) {
      setNewArrowOverSquare({ square, color: resolveArrowColor(modifiers) });
    } else {
      setNewArrowOverSquare(null);
    }
  };

  // if the position changes, animate to the new position
  createEffect(
    on(
      () => options.position,
      (position) => {
        const newPosition = toPositionObject(position);

        // clear internal arrows on position change
        if (untrack(() => options.clearArrowsOnPositionChange)) {
          untrack(clearArrows);
        }

        // if no animation, just set the position
        if (!untrack(() => options.showAnimations)) {
          setCurrentPosition(newPosition);
          return;
        }

        const animationDurationInMs = untrack(
          () => options.animationDurationInMs,
        );
        const chessboardColumns = untrack(() => options.chessboardColumns);
        const chessboardRows = untrack(() => options.chessboardRows);
        const boardOrientation = untrack(() => options.boardOrientation);

        // save copy of the waiting position so we can use it but clear it
        const currentWaitingForAnimationPosition =
          waitingForAnimationPosition();

        // if we are waiting for an animation to complete, end it immediately
        if (currentWaitingForAnimationPosition) {
          setCurrentPosition(currentWaitingForAnimationPosition);
          setWaitingForAnimationPosition(null);
        }

        const base = currentWaitingForAnimationPosition ?? currentPosition();

        // get list of position updates as pieces to potentially animate
        const positionUpdates = getPositionUpdates(
          base,
          newPosition,
          chessboardColumns,
          boardOrientation,
        );

        const multiplePiecesMoved = Object.keys(positionUpdates).length > 1;
        const manual = manuallyDroppedPieceAndSquare();

        // manually dropped piece caused multiple pieces to move (e.g. castling)
        if (manual && multiplePiecesMoved) {
          // create a new position with just the dropped piece moved
          const intermediatePosition = { ...currentPosition() };
          delete intermediatePosition[manual.sourceSquare];
          intermediatePosition[manual.targetSquare] = {
            pieceType: manual.piece,
          };
          setCurrentPosition(intermediatePosition);

          // create position differences with only the other pieces' movements
          const otherPiecesUpdates = { ...positionUpdates };
          delete otherPiecesUpdates[manual.sourceSquare];
          setPositionDifferences(otherPiecesUpdates);

          const timer = setTimeout(() => {
            setCurrentPosition(newPosition);
            setPositionDifferences({});
            setManuallyDroppedPieceAndSquare(null);
          }, animationDurationInMs);
          onCleanup(() => clearTimeout(timer));
          return;
        }

        // new position was a result of a manual drop
        if (manual) {
          // no animation needed, just set the position and reset the flag
          setCurrentPosition(newPosition);
          setManuallyDroppedPieceAndSquare(null);
          return;
        }

        if (Object.keys(positionUpdates).length === 0) {
          const promotionUpdates = getPromotionUpdates(
            base,
            newPosition,
            chessboardRows,
            chessboardColumns,
          );
          if (Object.keys(promotionUpdates).length === 1) {
            setPositionDifferences(promotionUpdates);
            setWaitingForAnimationPosition(newPosition);

            const timer = setTimeout(() => {
              setCurrentPosition(newPosition);
              setPositionDifferences({});
              setWaitingForAnimationPosition(null);
            }, animationDurationInMs);
            onCleanup(() => clearTimeout(timer));
            return;
          }
        }

        // new position was a result of an external move
        setPositionDifferences(positionUpdates);
        setWaitingForAnimationPosition(newPosition);

        const timer = setTimeout(() => {
          setCurrentPosition(newPosition);
          setPositionDifferences({});
          setWaitingForAnimationPosition(null);
        }, animationDurationInMs);
        onCleanup(() => clearTimeout(timer));
      },
      { defer: true },
    ),
  );

  // if the dimensions change, recreate the position
  createEffect(
    on(
      () => [
        options.chessboardRows,
        options.chessboardColumns,
        options.boardOrientation,
      ],
      () => {
        setCurrentPosition(toPositionObject(untrack(() => options.position)));
      },
      { defer: true },
    ),
  );

  // if the arrows change, call the onArrowsChange callback
  createEffect(() => {
    const arrows = internalArrows();
    untrack(() => options.onArrowsChange)?.({ arrows });
  });

  const handleDragStart = (event: DragStartEvent) => {
    const source = event.operation.source;
    if (!source) return;
    const data = source.data as unknown as
      | { isSparePiece?: boolean; pieceType?: string }
      | undefined;
    const isSparePiece = data?.isSparePiece ?? false;
    const id = String(source.id);
    const pieceType =
      data?.pieceType ?? currentPosition()[id]?.pieceType ?? id;

    untrack(() => options.onPieceDrag)?.({
      isSparePiece,
      piece: isSparePiece ? { pieceType: id } : (currentPosition()[id] ?? { pieceType }),
      square: isSparePiece ? null : id,
    });

    setDraggingPiece({ isSparePiece, position: id, pieceType });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // drag was cancelled (e.g. Escape or right-click) — reset without dropping
    if (event.canceled) {
      setDraggingPiece(null);
      untrack(() => options.onPieceDragCancel)?.();
      return;
    }

    const dragging = draggingPiece();
    if (!dragging) return;

    const target = event.operation.target;
    const dropSquare = target ? String(target.id) : null;

    // dropped outside of droppable area (e.g. off board)
    if (!dropSquare) {
      untrack(() => options.onPieceDrop)?.({
        piece: dragging,
        sourceSquare: dragging.position,
        targetSquare: null,
      });
      // set as manually dropped piece so that no animation is shown
      setManuallyDroppedPieceAndSquare({
        piece: dragging.pieceType,
        sourceSquare: dragging.position,
        targetSquare: '',
      });
      setDraggingPiece(null);
      return;
    }

    const isDropValid = untrack(() => options.onPieceDrop)?.({
      piece: dragging,
      sourceSquare: dragging.position,
      targetSquare: dropSquare,
    });

    // if the drop is valid, set the manually dropped piece and square
    if (isDropValid) {
      setManuallyDroppedPieceAndSquare({
        piece: dragging.pieceType,
        sourceSquare: dragging.position,
        targetSquare: dropSquare,
      });
    }
    setDraggingPiece(null);
  };

  // Sensors: right-button (button 2) never starts a drag so right-drag can
  // draw arrows; keyboard sensor stays enabled for a11y.
  //
  // NOTE: this array is created ONCE (not a memo) with a stable identity.
  // The @dnd-kit/solid provider memoizes its DragDropManager over these
  // props — a recomputed array would make it silently swap in a fresh,
  // listener-less manager after the first position change, killing all
  // subsequent drags. Live option values are still honored because
  // `activationConstraints` reads them lazily on every pointerdown.
  const sensors = [
    RightClickCancelSensor.configure({
      activationConstraints: () => [
        new PointerActivationConstraints.Distance({
          value: options.dragActivationDistance,
        }),
      ],
      preventActivation: (event: PointerEvent) => event.button === 2,
    }),
    KeyboardSensor,
  ];

  // Same stability requirement as `sensors` above: computed once.
  // `allowDragOffBoard` toggles at runtime are not supported (documented);
  // the dragging position stays live via the getter.
  const modifiers = options.allowDragOffBoard
    ? []
    : [
        preventDragOffBoard(options.id, () => draggingPiece()?.position ?? ''),
      ];

  const contextValue: ChessboardContextType = {
    options,
    isWrapped: true,
    board,
    currentPosition,
    draggingPiece,
    positionDifferences,
    newArrowStartSquare,
    newArrowOverSquare,
    internalArrows,
    setNewArrowStartSquare,
    setNewArrowOverSquare: setNewArrowOverSquareWithModifiers,
    drawArrow,
    clearArrows,
  };

  return (
    <ChessboardContext.Provider value={contextValue}>
      <DragDropProvider
        sensors={sensors}
        modifiers={modifiers}
        plugins={(defaults) =>
          // `allowAutoScroll: false` removes the default AutoScroller plugin.
          untrack(() => options.allowAutoScroll)
            ? defaults
            : defaults.filter((p) => p !== AutoScroller)
        }
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {props.children}
      </DragDropProvider>
    </ChessboardContext.Provider>
  );
}
