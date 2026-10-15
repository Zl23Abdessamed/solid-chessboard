import * as solid_js from 'solid-js';
import { JSX, Accessor } from 'solid-js';

type Arrow = {
    startSquare: string;
    endSquare: string;
    color: string;
};
type SquareDataType$1 = {
    squareId: string;
    isLightSquare: boolean;
};
type PieceDataType = {
    pieceType: string;
};
type DraggingPieceDataType = {
    isSparePiece: boolean;
    position: string;
    pieceType: string;
};
type PositionDataType = {
    [square: string]: PieceDataType;
};
type SquareHandlerArgs = {
    piece: PieceDataType | null;
    square: string;
};
type PieceHandlerArgs = {
    isSparePiece: boolean;
    piece: PieceDataType;
    square: string | null;
};
type PieceDropHandlerArgs = {
    piece: DraggingPieceDataType;
    sourceSquare: string;
    targetSquare: string | null;
};
type SquareRenderer = ({ piece, square, children, }: SquareHandlerArgs & {
    children?: JSX.Element;
}) => JSX.Element;
type PieceRenderObject = Record<string, (props?: {
    fill?: string;
    square?: string;
    svgStyle?: JSX.CSSProperties;
}) => JSX.Element>;
type FenPieceString = 'p' | 'r' | 'n' | 'b' | 'q' | 'k' | 'P' | 'R' | 'N' | 'B' | 'Q' | 'K';
type ArrowModifiers = {
    shiftKey: boolean;
    ctrlKey: boolean;
    altKey?: boolean;
    metaKey?: boolean;
};

declare function defaultBoardStyle(chessboardColumns: number): JSX.CSSProperties;
declare const defaultSquareStyle: JSX.CSSProperties;
declare const defaultDarkSquareStyle: JSX.CSSProperties;
declare const defaultLightSquareStyle: JSX.CSSProperties;
declare const defaultDropSquareStyle: JSX.CSSProperties;
declare const defaultDarkSquareNotationStyle: JSX.CSSProperties;
declare const defaultLightSquareNotationStyle: JSX.CSSProperties;
declare const defaultAlphaNotationStyle: JSX.CSSProperties;
declare const defaultNumericNotationStyle: JSX.CSSProperties;
declare const defaultDraggingPieceStyle: JSX.CSSProperties;
declare const defaultDraggingPieceGhostStyle: JSX.CSSProperties;
declare const defaultArrowOptions: {
    colors: {
        default: string;
        shift: string;
        ctrl: string;
        alt: string;
        meta: string;
    };
    /** @deprecated Use `colors.default` instead */
    color: string;
    /** @deprecated Use `colors.shift` instead */
    secondaryColor: string;
    /** @deprecated Use `colors.ctrl` instead */
    tertiaryColor: string;
    arrowLengthReducerDenominator: number;
    sameTargetArrowLengthReducerDenominator: number;
    arrowWidthDenominator: number;
    activeArrowWidthMultiplier: number;
    opacity: number;
    activeOpacity: number;
    arrowStartOffset: number;
};

type ChessboardOptions = {
    id?: string;
    pieces?: PieceRenderObject;
    position?: string | PositionDataType;
    boardOrientation?: 'white' | 'black';
    chessboardRows?: number;
    chessboardColumns?: number;
    boardStyle?: JSX.CSSProperties;
    squareStyle?: JSX.CSSProperties;
    squareStyles?: Record<string, JSX.CSSProperties>;
    darkSquareStyle?: JSX.CSSProperties;
    lightSquareStyle?: JSX.CSSProperties;
    dropSquareStyle?: JSX.CSSProperties;
    draggingPieceStyle?: JSX.CSSProperties;
    draggingPieceGhostStyle?: JSX.CSSProperties;
    darkSquareNotationStyle?: JSX.CSSProperties;
    lightSquareNotationStyle?: JSX.CSSProperties;
    alphaNotationStyle?: JSX.CSSProperties;
    numericNotationStyle?: JSX.CSSProperties;
    showNotation?: boolean;
    animationDurationInMs?: number;
    showAnimations?: boolean;
    allowDragging?: boolean;
    allowDragOffBoard?: boolean;
    allowAutoScroll?: boolean;
    dragActivationDistance?: number;
    allowDrawingArrows?: boolean;
    arrows?: Arrow[];
    arrowOptions?: typeof defaultArrowOptions;
    clearArrowsOnClick?: boolean;
    clearArrowsOnPositionChange?: boolean;
    canDragPiece?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => boolean;
    onArrowsChange?: ({ arrows }: {
        arrows: Arrow[];
    }) => void;
    onMouseOutSquare?: ({ piece, square }: SquareHandlerArgs) => void;
    onMouseOverSquare?: ({ piece, square }: SquareHandlerArgs) => void;
    onPieceClick?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => void;
    onPieceDrag?: ({ isSparePiece, piece, square }: PieceHandlerArgs) => void;
    onPieceDragCancel?: () => void;
    onPieceDrop?: ({ piece, sourceSquare, targetSquare, }: PieceDropHandlerArgs) => boolean;
    onSquareClick?: ({ piece, square }: SquareHandlerArgs) => void;
    onSquareMouseDown?: ({ piece, square }: SquareHandlerArgs, e: MouseEvent) => void;
    onSquareMouseUp?: ({ piece, square }: SquareHandlerArgs, e: MouseEvent) => void;
    onSquareRightClick?: ({ piece, square }: SquareHandlerArgs) => void;
    squareRenderer?: SquareRenderer;
};
/** Callbacks that remain optional after defaults are merged in. */
type OptionalCallbackKeys = 'canDragPiece' | 'onArrowsChange' | 'onMouseOutSquare' | 'onMouseOverSquare' | 'onPieceClick' | 'onPieceDrag' | 'onPieceDragCancel' | 'onPieceDrop' | 'onSquareClick' | 'onSquareMouseDown' | 'onSquareMouseUp' | 'onSquareRightClick' | 'squareRenderer';
type ResolvedChessboardOptions = Omit<Required<ChessboardOptions>, OptionalCallbackKeys> & Pick<ChessboardOptions, OptionalCallbackKeys>;
type ChessboardContextType = {
    options: ResolvedChessboardOptions;
    isWrapped: true;
    board: Accessor<SquareDataType[][]>;
    currentPosition: Accessor<PositionDataType>;
    draggingPiece: Accessor<DraggingPieceDataType | null>;
    positionDifferences: Accessor<Record<string, string>>;
    newArrowStartSquare: Accessor<string | null>;
    newArrowOverSquare: Accessor<{
        square: string;
        color: string;
    } | null>;
    internalArrows: Accessor<Arrow[]>;
    setNewArrowStartSquare: (square: string | null) => void;
    setNewArrowOverSquare: (square: string | null, modifiers?: ArrowModifiers) => void;
    drawArrow: (endSquare: string, modifiers?: ArrowModifiers) => void;
    clearArrows: () => void;
};
type SquareDataType = {
    squareId: string;
    isLightSquare: boolean;
};
declare function useChessboardContext(): ChessboardContextType;
declare function ChessboardProvider(props: {
    children: JSX.Element;
    options?: ChessboardOptions;
}): JSX.Element;

type ChessboardProps = {
    options?: ChessboardOptions;
};
declare function Chessboard(props: ChessboardProps): solid_js.JSX.Element;

declare const defaultPieces: PieceRenderObject;

type SparePieceProps = {
    pieceType: string;
};
declare function SparePiece(props: SparePieceProps): solid_js.JSX.Element;

declare function generateBoard(noOfRows: number, noOfColumns: number, boardOrientation: 'white' | 'black'): SquareDataType$1[][];
declare function rowIndexToChessRow(row: number, noOfRows: number, boardOrientation: 'white' | 'black'): string;
declare function columnIndexToChessColumn(column: number, noOfColumns: number, boardOrientation: 'white' | 'black'): string;
declare function chessColumnToColumnIndex(column: string, noOfColumns: number, boardOrientation: 'white' | 'black'): number;
declare function chessRowToRowIndex(row: string, noOfRows: number, boardOrientation: 'white' | 'black'): number;
declare function fenStringToPositionObject(fen: string, noOfRows: number, noOfColumns: number): PositionDataType;
/**
 * Return an object with the pieces that have moved from the old position to the new position.
 * The keys are the source square names (e.g. "e2") and the values are the new square positions (e.g. "e4"), indicating that the piece in square "e2" has moved to square "e4".
 */
declare function getPositionUpdates(oldPosition: PositionDataType, newPosition: PositionDataType, noOfColumns: number, boardOrientation: 'white' | 'black'): {
    [square: string]: string;
};
declare function getPromotionUpdates(oldPosition: PositionDataType, newPosition: PositionDataType, noOfRows: number, noOfColumns: number): {
    [square: string]: string;
};
/**
 * Retrieves the coordinates at the centre of the requested square, relative to the top left of the board (0, 0).
 */
declare function getRelativeCoords(boardOrientation: 'white' | 'black', boardWidth: number, chessboardColumns: number, chessboardRows: number, square: string): {
    x: number;
    y: number;
};
declare function isTouchEndWithinSquare(id: string, squareId: string, e: TouchEvent): boolean;

export { type Arrow, type ArrowModifiers, Chessboard, type ChessboardContextType, type ChessboardOptions, ChessboardProvider, type DraggingPieceDataType, type FenPieceString, type PieceDataType, type PieceDropHandlerArgs, type PieceHandlerArgs, type PieceRenderObject, type PositionDataType, type ResolvedChessboardOptions, SparePiece, type SquareDataType$1 as SquareDataType, type SquareHandlerArgs, type SquareRenderer, chessColumnToColumnIndex, chessRowToRowIndex, columnIndexToChessColumn, defaultAlphaNotationStyle, defaultArrowOptions, defaultBoardStyle, defaultDarkSquareNotationStyle, defaultDarkSquareStyle, defaultDraggingPieceGhostStyle, defaultDraggingPieceStyle, defaultDropSquareStyle, defaultLightSquareNotationStyle, defaultLightSquareStyle, defaultNumericNotationStyle, defaultPieces, defaultSquareStyle, fenStringToPositionObject, generateBoard, getPositionUpdates, getPromotionUpdates, getRelativeCoords, isTouchEndWithinSquare, rowIndexToChessRow, useChessboardContext };
