import type { JSX } from 'solid-js';

export function defaultBoardStyle(
  chessboardColumns: number,
): JSX.CSSProperties {
  return {
    display: 'grid',
    'grid-template-columns': `repeat(${chessboardColumns}, 1fr)`,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    position: 'relative',
  };
}

export const defaultSquareStyle: JSX.CSSProperties = {
  'aspect-ratio': '1 / 1',
  display: 'flex',
  'justify-content': 'center',
  'align-items': 'center',
  position: 'relative',
};

export const defaultDarkSquareStyle: JSX.CSSProperties = {
  'background-color': '#B58863',
};

export const defaultLightSquareStyle: JSX.CSSProperties = {
  'background-color': '#F0D9B5',
};

export const defaultDropSquareStyle: JSX.CSSProperties = {
  'box-shadow': 'inset 0 0 0 1px black',
};

export const defaultDarkSquareNotationStyle: JSX.CSSProperties = {
  color: '#F0D9B5',
};

export const defaultLightSquareNotationStyle: JSX.CSSProperties = {
  color: '#B58863',
};

export const defaultAlphaNotationStyle: JSX.CSSProperties = {
  'font-size': '13px',
  position: 'absolute',
  bottom: '1px',
  right: '4px',
  'user-select': 'none',
};

export const defaultNumericNotationStyle: JSX.CSSProperties = {
  'font-size': '13px',
  position: 'absolute',
  top: '2px',
  left: '2px',
  'user-select': 'none',
};

export const defaultDraggingPieceStyle: JSX.CSSProperties = {
  transform: 'scale(1.2)',
};

export const defaultDraggingPieceGhostStyle: JSX.CSSProperties = {
  opacity: 0.5,
};

export const defaultArrowOptions = {
  colors: {
    default: '#ffaa00',
    shift: '#4caf50',
    ctrl: '#f44336',
    alt: '#9c27b0',
    meta: '#fbbf24',
  },
  /** @deprecated Use `colors.default` instead */
  color: '#ffaa00',
  /** @deprecated Use `colors.shift` instead */
  secondaryColor: '#4caf50',
  /** @deprecated Use `colors.ctrl` instead */
  tertiaryColor: '#f44336',
  arrowLengthReducerDenominator: 8,
  sameTargetArrowLengthReducerDenominator: 4,
  arrowWidthDenominator: 5,
  activeArrowWidthMultiplier: 0.9,
  opacity: 0.65,
  activeOpacity: 0.5,
  arrowStartOffset: 0,
};
