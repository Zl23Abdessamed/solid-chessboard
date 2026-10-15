# solid-chessboard — Library Architecture & Implementation Guide

> **Target ecosystem**: SolidJS & SolidStart
> **Base template**: `solid-lib-starter` (via `npm create solid`)
> **Package manager**: **npm** (not pnpm). Commit `package-lock.json`.
> **Reference implementation**: [`react-chessboard`](https://github.com/Clariity/react-chessboard) (`react@^19`, `@dnd-kit/core ^6.3.1`)
> **Core philosophy**: Pure UI component. It holds **no chess rules**. Game logic (legal moves, turn, checkmate) is left to the consumer (typically `chess.js`). The board is controlled via `position` (FEN string or position object) + `onPieceDrop` returning `boolean`.

---

## Table of Contents

1. [What the Library Does](#1-what-the-library-does)
2. [Project Setup (npm)](#2-project-setup-npm)
3. [Package Configuration](#3-package-configuration-packagejson)
4. [Build, Dev and Test Configuration](#4-build-dev-and-test-configuration)
5. [File Structure and Hierarchy](#5-file-structure-and-hierarchy)
6. [Files and Their Exported Functions / Vars](#6-files-and-their-exported-functions--vars)
7. [Workflow — From Import to Interaction](#7-workflow--from-import-to-interaction)
8. [React → SolidJS Translation Rules](#8-critical-react--solidjs-translation-rules)
9. [Solid-Specific Pitfalls](#9-solid-specific-pitfalls-and-gotchas)
10. [SSR / SolidStart Notes](#10-ssr--solidstart-notes)
11. [Testing Strategy](#11-testing-strategy)
12. [Publishing Checklist](#12-publishing-checklist)
13. [Next Steps for Development](#13-next-steps-for-development)

---

## 1. What the Library Does

- Renders a responsive 2D chessboard (`<Chessboard options={...} />`) as a CSS grid of squares with SVG pieces (Cburnett set by default).
- Supports:
  - drag-and-drop (via `@dnd-kit/solid`)
  - click-to-move (via callbacks)
  - spare pieces (a palette outside the board)
  - arrows (controlled via props + user-drawn with right-drag)
  - move animations
  - custom board sizes (`chessboardRows` / `chessboardColumns`)
  - orientation flip
  - full styling overrides
  - custom pieces (`pieces`) and custom squares (`squareRenderer` / `squareStyles`)
- Exposes utility functions for FEN ↔ position-object conversion, board generation, move-diffing for animation, and coordinate math.
- **SolidJS advantage**: thanks to fine-grained reactivity, moving a piece only updates the specific DOM nodes involved (source square, target square and the animated piece) without re-rendering the whole board or component tree.

---

---

Useful npm commands for this project:

| Task | Command |
|---|---|
| Install deps (clean, reproducible) | `npm ci` |
| Dev playground | `npm run dev` |
| Build library | `npm run build` |
| Run all tests (client + SSR) | `npm test` |
| Run only client tests | `npm run test:client` |
| Run only SSR tests | `npm run test:ssr` |
| Lint everything | `npm run lint` |
| Type-check only | `npm run lint:types` |
| Format sources | `npm run format` |
| Check for dependency updates | `npm run update-deps` |
| Preview the tarball that will be published | `npm pack --dry-run` |

---

## 3. Package Configuration (`package.json`)

Exact configuration based on the `solid-lib-starter` template, converted to **npm**:

```json
{
  "name": "solid-chessboard",
  "version": "0.0.0",
  "description": "A highly customizable, performant chessboard component for SolidJS",
  "license": "MIT",
  "author": "zallaabdessamed",
  "contributors": [],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/zallaabdessamed/solid-chessboard.git"
  },
  "homepage": "https://github.com/zallaabdessamed/solid-chessboard#readme",
  "bugs": {
    "url": "https://github.com/zallaabdessamed/solid-chessboard/issues"
  },
  "files": [
    "dist"
  ],
  "private": false,
  "sideEffects": false,
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "browser": {},
  "exports": {
    "solid": {
      "development": "./dist/dev.jsx",
      "import": "./dist/index.jsx"
    },
    "development": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/dev.js"
      }
    },
    "import": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "typesVersions": {},
  "scripts": {
    "dev": "vite serve dev",
    "build": "tsup",
    "test": "concurrently \"npm:test:*\"",
    "test:client": "vitest",
    "test:ssr": "npm run test:client -- --mode ssr",
    "prepublishOnly": "npm run build",
    "format": "prettier --ignore-path .gitignore -w \"src/**/*.{js,ts,json,css,tsx,jsx}\" \"dev/**/*.{js,ts,json,css,tsx,jsx}\"",
    "lint": "concurrently \"npm:lint:*\"",
    "lint:code": "eslint --ignore-path .gitignore --max-warnings 0 \"src/**/*.{js,ts,tsx,jsx}\"",
    "lint:types": "tsc --noEmit",
    "update-deps": "npx npm-check-updates -i"
  },
  "peerDependencies": {
    "solid-js": "^1.6.0"
  },
  "dependencies": {
    "@dnd-kit/dom": "^1.0.0",
    "@dnd-kit/solid": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "@typescript-eslint/eslint-plugin": "^7.9.0",
    "@typescript-eslint/parser": "^7.9.0",
    "chess.js": "^1.0.0",
    "concurrently": "^8.2.2",
    "esbuild": "^0.21.3",
    "esbuild-plugin-solid": "^0.6.0",
    "eslint": "^8.56.0",
    "eslint-plugin-eslint-comments": "^3.2.0",
    "eslint-plugin-no-only-tests": "^3.1.0",
    "jsdom": "^24.0.0",
    "prettier": "3.0.0",
    "solid-js": "^1.8.17",
    "tsup": "^8.0.2",
    "tsup-preset-solid": "^2.2.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vite-plugin-solid": "^2.10.2",
    "vitest": "^1.6.0"
  },
  "keywords": [
    "solid",
    "solidjs",
    "chess",
    "chessboard",
    "dnd-kit"
  ],
  "engines": {
    "node": ">=18",
    "npm": ">=9.0.0"
  }
}
```

### What changed from the pnpm version

| Field | Before (pnpm) | Now (npm) |
|---|---|---|
| `scripts.test` | `concurrently pnpm:test:*` | `concurrently "npm:test:*"` |
| `scripts.test:ssr` | `pnpm run test:client --mode ssr` | `npm run test:client -- --mode ssr` (note the `--` separator so npm forwards the flag) |
| `scripts.prepublishOnly` | `pnpm build` | `npm run build` |
| `scripts.lint` | `concurrently pnpm:lint:*` | `concurrently "npm:lint:*"` |
| `scripts.lint:code` | unquoted glob | quoted glob (portable across shells, including Windows) |
| `scripts.update-deps` | `pnpm up -Li` | `npx npm-check-updates -i` |
| `packageManager` | `pnpm@9.1.1` | **removed** (it is a Corepack field and only needed for pnpm/yarn) |
| `engines` | `pnpm >=9.0.0` | `npm >=9.0.0` |
| Lockfile | `pnpm-lock.yaml` | `package-lock.json` |

> **Notes**
> - `@dnd-kit/solid` and `@dnd-kit/dom` are runtime `dependencies` because they are required for drag-and-drop. They mirror `@dnd-kit/core` (+ `@dnd-kit/modifiers`) in the React version.
> - `solid-js` is a **peer** dependency (so the consumer's app and the library share a single Solid runtime) and also a dev dependency (for the playground and tests). Never bundle it.
> - If a `pnpm-lock.yaml` or `.npmrc` with pnpm-specific settings exists in the starter, delete it, then run `npm install` to generate `package-lock.json`.
> - Delete the `pnpm-workspace.yaml` file if the template included one.

---

## 4. Build, Dev and Test Configuration

### `tsup.config.ts`

```ts
import { defineConfig } from 'tsup';
import * as preset from 'tsup-preset-solid';

const preset_options: preset.PresetOptions = {
  entries: [
    {
      // entries with '.tsx' extension will have `solid` export condition generated
      entry: 'src/index.ts',
      // will generate a separate development entry (dev.js / dev.jsx)
      dev_entry: true,
    },
  ],
  // Set to `true` to remove all `console.log` calls and `debugger` statements in prod builds
  drop_console: true,
  // Set to `true` to generate a CommonJS build alongside ESM
  // cjs: true,
};

export default defineConfig(config => {
  const watching = !!config.watch;
  const parsed_options = preset.parsePresetOptions(preset_options, watching);

  if (!watching) {
    const package_fields = preset.generatePackageExports(parsed_options);
    // Prints the "exports" map to paste into package.json when it changes
    console.log(`\npackage.json: \n${JSON.stringify(package_fields, null, 2)}\n\n`);
    // Optionally: preset.writePackageJson(package_fields) to auto-update package.json
  }

  return preset.generateTsupOptions(parsed_options);
});
```

Build outputs in `dist/`:

| File | Purpose |
|---|---|
| `index.js` | Compiled ESM (production) |
| `dev.js` | Compiled ESM with dev-only code |
| `index.jsx` / `dev.jsx` | **Uncompiled Solid JSX**, served via the `solid` export condition so that the consumer's `vite-plugin-solid` compiles it for their target (client or SSR) |
| `index.d.ts` | Type declarations |

### `vite.config.ts` (playground + vitest)

```ts
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    // Make sure Vitest resolves the browser build of solid-js
    conditions: ['development', 'browser'],
  },
  test: {
    environment: 'jsdom',
    transformMode: { web: [/\.[jt]sx?$/] },
    setupFiles: [],
    // Prevents "solid-js" being externalized (needed for reactivity in tests)
    deps: { optimizer: { web: { include: ['solid-js'] } } },
  },
});
```

For SSR tests (`npm run test:ssr`), the starter ships a `vitest` mode named `ssr` that swaps `environment` to `node` and the `solid` plugin to `{ solid: { generate: 'ssr' } }`.

### `dev/` playground

| File | Role |
|---|---|
| `dev/index.html` | HTML shell with `<div id="root">` and a `<script type="module" src="./index.tsx">` |
| `dev/index.tsx` | `render(() => <App />, document.getElementById('root')!)` |
| `dev/App.tsx` | Test harness. Should contain at least: default board, `chess.js` play loop, click-to-move, spare pieces, arrows, orientation toggle, 4×4 / 10×10 custom boards, custom `pieces` |

---

## 5. File Structure and Hierarchy

```text
solid-chessboard/
├── dev/                          # Local playground (vite serve dev)
│   ├── index.html                # HTML shell
│   ├── App.tsx                   # Test harness for the chessboard
│   └── index.tsx                 # Vite entry point
├── src/                          # Library source (built to dist/ via tsup)
│   ├── index.ts                  # Public barrel export
│   ├── Chessboard.tsx            # Public <Chessboard> wrapper
│   ├── ChessboardProvider.tsx    # ChessboardOptions type + context + DnD provider + all state/logic
│   ├── Board.tsx                 # Grid renderer using <For> + DragOverlay
│   ├── Square.tsx                # Single square: styles, notation, mouse/touch/arrow events
│   ├── Piece.tsx                 # Single piece: SVG lookup, animation, ghost/clone styles
│   ├── Draggable.tsx             # @dnd-kit/solid useDraggable wrapper
│   ├── Droppable.tsx             # @dnd-kit/solid useDroppable wrapper
│   ├── Arrows.tsx                # SVG overlay for arrows
│   ├── SparePiece.tsx            # Draggable piece outside the board
│   ├── pieces.tsx                # defaultPieces (12 SVG render functions)
│   ├── defaults.ts               # Default styles + defaultArrowOptions
│   ├── utils.ts                  # Board/FEN/animation/coords helpers (pure functions)
│   ├── types.ts                  # Shared public types
│   ├── modifiers.ts              # @dnd-kit Modifier: preventDragOffBoard
│   └── RightClickCancelSensor.ts # Sensor/plugin: right-click cancels a drag (see §6)
├── test/                         # Vitest specs
│   ├── utils.test.ts             # Pure function tests (FEN, board, diffing)
│   ├── Chessboard.test.tsx       # Render + interaction tests (client)
│   └── ssr.test.tsx              # renderToString smoke test (ssr mode)
├── tsconfig.json
├── tsconfig.build.json
├── tsup.config.ts                # Build config using tsup-preset-solid
├── vite.config.ts                # Vite config for dev playground and vitest
├── package.json
├── package-lock.json             # npm lockfile (commit it)
└── README.md, LICENSE (MIT)
```

**Dependency hierarchy (runtime)**:

```text
<Chessboard> ──wraps──> <ChessboardProvider options> ──provides──> ChessboardContext
       │                          │
       │                          └── DnD provider (@dnd-kit/solid: sensors, collision detection,
       │                                            onDragStart / onDragEnd / onDragCancel)
       └── <Board> (if not already wrapped)
                ├── <For each={board()}> → <Droppable> → <Square> → <Draggable> → <Piece>
                ├── <Arrows> (SVG overlay)
                └── <DragOverlay> (floating clone while dragging)
<SparePiece> (outside <Board> but inside <ChessboardProvider>) → <Draggable> → <Piece>
```

---

## 6. Files and Their Exported Functions / Vars

### `src/index.ts` — Public entry

Re-exports everything. Consumer does `import { Chessboard } from 'solid-chessboard'`:

```ts
export * from './Chessboard.js';
export * from './ChessboardProvider.js';
export * from './defaults.js';
export * from './pieces.js';
export * from './SparePiece.js';
export * from './types.js';
export * from './utils.js';
```

### `src/Chessboard.tsx`

| Export | Signature | Role |
|---|---|---|
| `Chessboard` | `function Chessboard(props: { options?: ChessboardOptions })` | Checks `useContext(ChessboardContext)`. If already wrapped (`isWrapped`), renders bare `<Board/>`; otherwise wraps `<Board/>` in `<ChessboardProvider options={props.options}>`. This enables the `ChessboardProvider + Chessboard + SparePiece` pattern. |

### `src/ChessboardProvider.tsx` — Core

**Exports**

- `type ChessboardOptions` — the single `options` object. All fields are optional:

| Group | Field | Type | Default |
|---|---|---|---|
| Identity | `id` | `string` | `'chessboard'` (DOM id prefix: `${id}-board`, `${id}-square-*`, `${id}-piece-*`; dnd id `dnd-${id}`) |
| Position / pieces | `pieces` | `PieceRenderObject` | `defaultPieces` |
| | `position` | `string \| PositionDataType` | start FEN `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR` |
| Geometry | `boardOrientation` | `'white' \| 'black'` | `'white'` |
| | `chessboardRows` | `number` | `8` |
| | `chessboardColumns` | `number` | `8` |
| Styles | `boardStyle` | `JSX.CSSProperties` | `defaultBoardStyle(cols)` |
| | `squareStyle` | `JSX.CSSProperties` | `defaultSquareStyle` |
| | `squareStyles` | `Record<string, JSX.CSSProperties>` | `{}` |
| | `darkSquareStyle` | `JSX.CSSProperties` | `defaultDarkSquareStyle` |
| | `lightSquareStyle` | `JSX.CSSProperties` | `defaultLightSquareStyle` |
| | `dropSquareStyle` | `JSX.CSSProperties` | `defaultDropSquareStyle` |
| | `draggingPieceStyle` | `JSX.CSSProperties` | `defaultDraggingPieceStyle` |
| | `draggingPieceGhostStyle` | `JSX.CSSProperties` | `defaultDraggingPieceGhostStyle` |
| Notation | `darkSquareNotationStyle` / `lightSquareNotationStyle` | `JSX.CSSProperties` | defaults in `defaults.ts` |
| | `alphaNotationStyle` / `numericNotationStyle` | `JSX.CSSProperties` | defaults in `defaults.ts` |
| | `showNotation` | `boolean` | `true` |
| Animation | `animationDurationInMs` | `number` | `300` |
| | `showAnimations` | `boolean` | `true` |
| Drag and drop | `allowDragging` | `boolean` | `true` |
| | `allowDragOffBoard` | `boolean` | `true` |
| | `allowAutoScroll` | `boolean` | `false` |
| | `dragActivationDistance` | `number` | `1` |
| Arrows | `allowDrawingArrows` | `boolean` | `true` |
| | `arrows` | `Arrow[]` | `[]` |
| | `arrowOptions` | `typeof defaultArrowOptions` | `defaultArrowOptions` |
| | `clearArrowsOnClick` | `boolean` | `true` |
| | `clearArrowsOnPositionChange` | `boolean` | `true` |
| Callbacks | `canDragPiece` | `(args: PieceHandlerArgs) => boolean` | — |
| | `onArrowsChange` | `(args: { arrows: Arrow[] }) => void` | — |
| | `onMouseOutSquare`, `onMouseOverSquare`, `onSquareClick`, `onSquareMouseDown`, `onSquareMouseUp`, `onSquareRightClick` | `(args: SquareHandlerArgs, e?: MouseEvent) => void` | — |
| | `onPieceClick`, `onPieceDrag` | `(args: PieceHandlerArgs) => void` | — |
| | `onPieceDragCancel` | `() => void` | — |
| | `onPieceDrop` | `(args: PieceDropHandlerArgs) => boolean` | — |
| | `squareRenderer` | `SquareRenderer` | — |

- `function ChessboardProvider(props: { children: JSX.Element; options?: ChessboardOptions })`
  - Uses `mergeProps` from `solid-js` to apply defaults to `props.options` (**do not destructure**).
  - Owns all state via `createSignal` (`draggingPiece`, `currentPosition`, `positionDifferences`, `internalArrows`, `newArrowStartSquare`, `newArrowOverSquare`, ...).
  - Computes the board grid via `createMemo(() => generateBoard(rows, cols, orientation))`, recalculated only when rows / cols / orientation change.
  - Provides `ChessboardContext` via `createContext` and wraps children in the `@dnd-kit/solid` provider.
- `function useChessboardContext()` — returns `useContext(ChessboardContext)`. Throws a helpful error if used outside the provider.

**Internal `ContextType`** (what children get). In Solid, every piece of live state is exposed as an **accessor** (a getter function), never as a plain value:

```ts
type ContextType = {
  // resolved options (reactive getters produced by mergeProps)
  options: Required<ChessboardOptions>;

  // live state (accessors)
  isWrapped: true;
  board: Accessor<SquareDataType[][]>;
  currentPosition: Accessor<PositionDataType>;
  draggingPiece: Accessor<DraggingPieceDataType | null>;
  positionDifferences: Accessor<Record<string, string>>; // { sourceSquare: targetSquare }
  newArrowStartSquare: Accessor<string | null>;
  newArrowOverSquare: Accessor<{ square: string; color: string } | null>;
  internalArrows: Accessor<Arrow[]>;

  // actions
  setNewArrowStartSquare: (square: string | null) => void;
  setNewArrowOverSquare: (square: string | null, modifiers?: ArrowModifiers) => void;
  drawArrow: (endSquare: string, modifiers?: ArrowModifiers) => void;
  clearArrows: () => void;
};
```

**Key internal handlers** (not exported, but they drive behaviour):

| Handler | Behaviour |
|---|---|
| `handleDragStart(event)` | Calls `onPieceDrag?.()`, then `setDraggingPiece({ isSparePiece, position: active.id, pieceType })`. |
| `handleDragEnd(event)` | `event.over?.id` is `targetSquare`. Calls `onPieceDrop({ piece, sourceSquare, targetSquare })`. If it returns truthy, records `manuallyDroppedPieceAndSquare` (suppresses animation for the user's own drop). If dropped off-board, calls `onPieceDrop` with `targetSquare: null`. Always resets `draggingPiece`. |
| `handleDragCancel()` | `setDraggingPiece(null)` + `onPieceDragCancel?.()`. |
| `drawArrow(endSquare, modifiers)` | Picks colour from `arrowOptions.colors.{default,shift,ctrl,alt,meta}`, toggles `internalArrows` (add, or remove if an identical start/end arrow exists), then notifies `onArrowsChange` from a `createEffect`. |
| `clearArrows()` | Clears `internalArrows` only if `clearArrowsOnClick` is true. |
| `collisionDetection` | `pointerWithin` if pointer coordinates exist, else `rectIntersection` (keyboard support). |
| `sensors` | Mouse + Touch + Keyboard + right-click-cancel, with `distance: dragActivationDistance`. |

### `src/Board.tsx`

| Export | Role |
|---|---|
| `function Board()` | Reads context. Renders `<div id={`${id}-board`} style={...grid}>`. Uses `<For each={board()}>` to map rows, and a nested `<For each={row}>` to map squares, giving **fine-grained DOM updates**. Each square is `<Droppable><Square><Show when={currentPosition()[squareId]}><Draggable><Piece/></Draggable></Show></Square></Droppable>`. Then renders `<Arrows/>` and `<DragOverlay>` with a cloned `<Piece clone/>`. When `allowDragOffBoard` is `false`, adds the `preventDragOffBoard` modifier. |

### `src/Square.tsx`

| Export | Role |
|---|---|
| `function Square(props: SquareProps)` | **No `memo` needed** — Solid components run once. Access props as `props.squareId` (**do not destructure at the top level**). Merges styles reactively: `defaultSquareStyle` + `squareStyle` + (light ? `lightSquareStyle` : `darkSquareStyle`) + (`isOver` ? `dropSquareStyle`). Renders notation spans (alpha on the bottom rank, numeric on the a-file, orientation-aware) when `showNotation` is true. Delegates the inner content to `squareRenderer?.({ piece, square, children })` or falls back to `<div style={squareStyles[squareId]}>{children}</div>`. |

**Event wiring in `Square`**

| DOM event | Behaviour |
|---|---|
| `onClick` | `onSquareClick` (button 0 only) |
| `onTouchStart` / `onTouchEnd` | Tap detection via `isTouchEndWithinSquare` and an `isClickingOnMobile` flag |
| `onContextMenu` | `onSquareRightClick` (suppressed if an arrow was just drawn) |
| `onMouseDown` | Button 0 → `clearArrows()`; button 2 → `setNewArrowStartSquare(squareId)` |
| `onMouseUp` | Button 2 → `drawArrow(squareId, modifiers)` |
| `onMouseOver` / `onMouseLeave` | `onMouseOverSquare` / `onMouseOutSquare`. While dragging, a `createEffect` on `isOver` replaces the raw mouse events (drag-aware). |

### `src/Piece.tsx`

| Export | Role |
|---|---|
| `function Piece(props: PieceProps)` | Looks up `options.pieces[props.pieceType]` (a render function). **Cursor**: `grabbing` if clone, `grab` by default, `pointer` if `!allowDragging` or `canDragPiece` returns false. **Ghost style** if `draggingPiece()?.position === props.position`; **drag style** if `props.clone`. **Animation**: a `createEffect` watches `positionDifferences()[props.position]`; when set, it measures the source square width via `document.querySelector('#${id}-square-${source}')`, then applies `transform: translate(dx, dy)` with `transition: transform ${animationDurationInMs}ms` and `z-index: 10`. Fires `onPieceClick` on click. Sets `touch-action: none`. |

### `src/Draggable.tsx` & `src/Droppable.tsx`

| Export | Role |
|---|---|
| `function Draggable(props: DraggableProps)` | Wraps `useDraggable` from `@dnd-kit/solid` with `id: props.position`, `data: { isSparePiece, pieceType }`, and `disabled: !allowDragging || (canDragPiece && !canDragPiece(...))`. Returns a `<div>` wired to the draggable's ref / listeners. `id` is the square (`e2`) for board pieces and the piece type (`wP`) for spare pieces. |
| `function Droppable(props: { squareId: string; children: (state: { isOver: boolean }) => JSX.Element })` | Wraps `useDroppable({ id: squareId })`. Calls `props.children({ isOver })` render-prop style so `<Square>` can apply `dropSquareStyle`. |

> **API caveat**: `@dnd-kit/solid` belongs to the newer `@dnd-kit` generation (`@dnd-kit/dom` + framework adapters), whose API differs from the legacy `@dnd-kit/core` used by `react-chessboard` (e.g. a `DragDropProvider` instead of `DndContext`, different sensor/modifier classes, and ref/handle APIs instead of `setNodeRef` + `listeners` spreading). Before coding `Draggable`, `Droppable`, the sensors and `modifiers.ts`, read the installed version's README/types in `node_modules/@dnd-kit/solid` and adapt the mapping above accordingly. The *behaviour* described here stays the same.

### `src/Arrows.tsx`

| Export | Role |
|---|---|
| `function Arrows()` | Absolutely-positioned `<svg viewBox="0 0 2048 H">` (`H = 2048 * rows / cols`, `pointer-events: none`, `z-index: 20`). Builds a `createMemo` merging `options.arrows + internalArrows() + currentlyDrawingArrow`. For each arrow (via `<For>`): `getRelativeCoords` for start/end centres, shortens by `arrowLengthReducerDenominator` (or `sameTargetArrowLengthReducerDenominator` when arrows share a target), offsets the start by `arrowStartOffset`, uses an L-shaped path for knight-distance arrows, else a straight `M start L end`. Each arrow gets its own `<marker>` arrowhead + `<path stroke={color} stroke-width={squareWidth / arrowWidthDenominator} opacity={...}>`. The in-progress arrow uses `activeOpacity` / `activeArrowWidthMultiplier`. |

### `src/SparePiece.tsx`

| Export | Role |
|---|---|
| `function SparePiece(props: { pieceType: string })` | `<Draggable isSparePiece position={props.pieceType} pieceType={props.pieceType}><Piece isSparePiece position={props.pieceType} pieceType={props.pieceType}/></Draggable>`. Must live inside `<ChessboardProvider>` (not inside `<Chessboard>`, which self-wraps). On drop, the same `onPieceDrop` is called with `piece.isSparePiece: true` and `sourceSquare === pieceType`. |

### `src/pieces.tsx`

| Export | Value |
|---|---|
| `const defaultPieces: PieceRenderObject` | 12 keys: `wP, wR, wN, wB, wQ, wK, bP, bR, bN, bB, bQ, bK`. Each is `(props?: { fill?, square?, svgStyle? }) => <svg viewBox="0 0 45 45" width="100%" height="100%">…` (Cburnett paths; white defaults to `#ffffff`, black to `#000000`, black stroke). Override via `options.pieces` (replace all, some, or add new keys for variants). |

### `src/defaults.ts`

| Export | Value |
|---|---|
| `defaultBoardStyle(chessboardColumns)` | `{ display: 'grid', 'grid-template-columns': `repeat(${cols}, 1fr)`, overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }` |
| `defaultSquareStyle` | `{ 'aspect-ratio': '1 / 1', display: 'flex', 'justify-content': 'center', 'align-items': 'center', position: 'relative' }` |
| `defaultDarkSquareStyle` | `{ 'background-color': '#B58863' }` |
| `defaultLightSquareStyle` | `{ 'background-color': '#F0D9B5' }` |
| `defaultDropSquareStyle` | `{ 'box-shadow': 'inset 0 0 0 1px black' }` |
| `defaultDarkSquareNotationStyle` | `{ color: '#F0D9B5' }` |
| `defaultLightSquareNotationStyle` | `{ color: '#B58863' }` |
| `defaultAlphaNotationStyle` | `{ 'font-size': '13px', position: 'absolute', bottom: '1px', right: '4px', 'user-select': 'none' }` |
| `defaultNumericNotationStyle` | `{ 'font-size': '13px', position: 'absolute', top: '2px', left: '2px', 'user-select': 'none' }` |
| `defaultDraggingPieceStyle` | `{ transform: 'scale(1.2)' }` |
| `defaultDraggingPieceGhostStyle` | `{ opacity: 0.5 }` |
| `defaultArrowOptions` | `{ colors: { default: '#ffaa00', shift: '#4caf50', ctrl: '#f44336', alt: '#9c27b0', meta: '#fbbf24' }, arrowLengthReducerDenominator: 8, sameTargetArrowLengthReducerDenominator: 4, arrowWidthDenominator: 5, activeArrowWidthMultiplier: 0.9, opacity: 0.65, activeOpacity: 0.5, arrowStartOffset: 0 }` |

> **Solid style note**: Solid's `style` prop accepts an object with **kebab-case** CSS property names (`'background-color'`), not the camelCase used in React. Use `JSX.CSSProperties` from `solid-js` for typing. Defaults here are therefore written in kebab-case. If you want to accept camelCase from consumers, normalise them in one place.

### `src/types.ts`

| Export | Definition |
|---|---|
| `type Arrow` | `{ startSquare: string; endSquare: string; color: string }` |
| `type SquareDataType` | `{ squareId: string; isLightSquare: boolean }` |
| `type PieceDataType` | `{ pieceType: string }` (`wP` = white pawn, `bK` = black king) |
| `type DraggingPieceDataType` | `{ isSparePiece: boolean; position: string; pieceType: string }` |
| `type PositionDataType` | `{ [square: string]: PieceDataType }` |
| `type SquareHandlerArgs` | `{ piece: PieceDataType \| null; square: string }` |
| `type PieceHandlerArgs` | `{ isSparePiece: boolean; piece: PieceDataType; square: string \| null }` |
| `type PieceDropHandlerArgs` | `{ piece: DraggingPieceDataType; sourceSquare: string; targetSquare: string \| null }` |
| `type SquareRenderer` | `(args: SquareHandlerArgs & { children?: JSX.Element }) => JSX.Element` |
| `type PieceRenderObject` | `Record<string, (props?: { fill?: string; square?: string; svgStyle?: JSX.CSSProperties }) => JSX.Element>` |
| `type FenPieceString` | `'p' \| 'r' \| 'n' \| 'b' \| 'q' \| 'k' \| 'P' \| 'R' \| 'N' \| 'B' \| 'Q' \| 'K'` |

### `src/utils.ts`

All functions are **pure** so they can be safely called inside `createMemo`.

| Export | Signature | Role |
|---|---|---|
| `generateBoard` | `(noOfRows, noOfColumns, boardOrientation) => SquareDataType[][]` | Builds each `squareId` from the column/row helpers; `isLightSquare = (row + col) % 2 === 0`. Memoized in the provider. |
| `rowIndexToChessRow` | `(row, noOfRows, orientation) => string` | white: `noOfRows - row`; black: `row + 1`. |
| `columnIndexToChessColumn` | `(col, noOfColumns, orientation) => string` | white: `chr(97 + col)`; black: mirrored. |
| `chessColumnToColumnIndex` | `(col, noOfColumns, orientation) => number` | Inverse of the above. |
| `chessRowToRowIndex` | `(row, noOfRows, orientation) => number` | Inverse of the above. |
| `fenStringToPositionObject` | `(fen, noOfRows, noOfColumns) => PositionDataType` | Parses the first FEN field (`split(' ')[0].split('/')`), expands digits, maps via `fenToPieceCode` (`p → bP`, `P → wP`). |
| `getPositionUpdates` | `(oldPos, newPos, noOfColumns, orientation) => { [source]: target }` | Diff for animation: same-type candidates where the old square was vacated; a single candidate maps directly; multiple candidates use piece-move heuristics (pawn same file, knight L, bishop diagonal + colour, rook rank/file, queen either, king one step); fallback is the first unused candidate. Handles castling as two entries. |
| `getPromotionUpdates` | `(oldPos, newPos, noOfRows, noOfColumns) => { [source]: target }` | Used only when `getPositionUpdates` is empty: detects a single pawn ↔ Q/R/B/N swap on the last rank (including reversal) via `pawnPromotesAtSquares`. |
| `getRelativeCoords` | `(orientation, boardWidth, cols, rows, square) => { x, y }` | Square centre for the arrow SVG. |
| `isTouchEndWithinSquare` | `(id, squareId, e: TouchEvent) => boolean` | Bounding-rect hit test for tap-vs-drag on mobile. |
| *(private)* `fenToPieceCode`, `pawnPromotesAtSquares` | — | Helpers for the above. |

### `src/modifiers.ts`

| Export | Role |
|---|---|
| `preventDragOffBoard(boardId, draggingPiecePosition)` | dnd-kit `Modifier` used when `allowDragOffBoard === false`. Clamps `transform.x/y` so the piece centre stays within the board rect (measured from `${boardId}-board` and the squares' `data-column` / `data-row` attributes). Non-square positions (spare pieces) bypass it. |

### `src/RightClickCancelSensor.ts`

| Export | Role |
|---|---|
| `RightClickCancelSensor` | Adds a `window` `contextmenu` listener per gesture; on right-click it cancels the active drag and removes the listener. Also removes the listener on normal end/cancel. Enables right-click-cancel of a drag while right-drag still draws arrows. Port this against the installed `@dnd-kit/dom` sensor/plugin API (see the API caveat above). |

---

## 7. Workflow — From Import to Interaction

### 1. Mount

```tsx
import { Chessboard } from 'solid-chessboard';
import type { PieceDropHandlerArgs } from 'solid-chessboard';
import { createSignal } from 'solid-js';
import { Chess } from 'chess.js';

function App() {
  // chess.js is mutable, so keep it as a plain instance and mirror the FEN in a signal
  const chess = new Chess();
  const [position, setPosition] = createSignal(chess.fen());

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (!targetSquare) return false; // dropped off-board
    try {
      chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      setPosition(chess.fen()); // signal update → fine-grained DOM diff
      return true;
    } catch {
      return false; // invalid move, piece snaps back
    }
  };

  return <Chessboard options={{ position: position(), onPieceDrop }} />;
}
```

> Passing `options={{ position: position(), ... }}` inside JSX is reactive: Solid wraps the expression in a getter, and `mergeProps` in the provider preserves it. Do **not** read `props.options.position` outside a tracking scope and store it in a `const`.

### 2. Render

`<ChessboardProvider>` normalises options with `mergeProps(defaults, props.options)`, converts `position` (FEN → `PositionDataType` via `fenStringToPositionObject`), builds `board` via `createMemo(generateBoard)`, and mounts the DnD provider with the sensors and collision detection. `<Board>` uses nested `<For>` to render squares: `Droppable(squareId)` → `Square` → (if a piece is on the square) `Draggable` → `Piece`. `Arrows` draws `arrows + internalArrows + in-progress` as SVG. `DragOverlay` holds the floating clone.

### 3. Drag

`@dnd-kit/solid` handles pointer events. `handleDragStart` fires `onPieceDrag` and updates the `draggingPiece` signal. `<Piece>` reactively shows the ghost style at the source and the clone style under the cursor. `Droppable`'s `isOver` highlights the target (`dropSquareStyle`). Right-click mid-drag or `Esc` → `handleDragCancel` → `onPieceDragCancel`.

### 4. Drop

`handleDragEnd` reads `over.id` (or `null` if off-board) and calls `onPieceDrop({ piece, sourceSquare, targetSquare })`.

- Returns `true` → the provider records `manuallyDroppedPieceAndSquare`, so the following `position` change is applied **instantly** (no self-animation); the consumer updates the `position` signal.
- Returns `false` / `undefined` → internal drag state resets and the board stays on the old `currentPosition` until the parent updates `position`.

### 5. External update + animation

A `createEffect` in `ChessboardProvider` watches the `position` option:

```ts
createEffect(
  on(
    () => options.position, // track only the position
    () => {
      const newPosition = toPositionObject(options.position);

      if (options.clearArrowsOnPositionChange) clearArrows();

      if (!options.showAnimations) {
        setCurrentPosition(newPosition);
        return;
      }

      const diff =
        Object.keys(getPositionUpdates(currentPosition(), newPosition, cols(), orientation())).length > 0
          ? getPositionUpdates(currentPosition(), newPosition, cols(), orientation())
          : getPromotionUpdates(currentPosition(), newPosition, rows(), cols());

      setPositionDifferences(diff);

      const timer = setTimeout(() => {
        setCurrentPosition(newPosition);
        setPositionDifferences({});
      }, options.animationDurationInMs);

      onCleanup(() => clearTimeout(timer)); // cancel if position changes again mid-animation
    },
    { defer: true },
  ),
);
```

`Piece` at each source square animates via a CSS `translate` from source to target. Castling (multi-move + manual drop) uses an intermediate position: the user's own drop is applied instantly and only the other rook animates. `showAnimations: false` skips all of this. A change in dimensions or orientation rebuilds `currentPosition` and `board`.

### 6. Arrows & clicks

- Controlled `arrows` always render.
- User arrows: right-button `onMouseDown` sets `newArrowStartSquare`; `onMouseOver` with `buttons === 2` sets `newArrowOverSquare` with a modifier-derived colour; `onMouseUp` calls `drawArrow` (toggle add/remove); left-click calls `clearArrows()` if `clearArrowsOnClick`. `onArrowsChange({ arrows: internalArrows() })` notifies the parent on each change.
- `onSquareClick`, `onPieceClick`, `onSquareMouseDown/Up`, `onSquareRightClick`, `onMouseOver/OutSquare` fire with `{ piece, square }` (or `{ isSparePiece, piece, square }`) for click-to-move, premoves, highlights (`squareStyles`), etc.
- `squareRenderer` can fully replace a square's inner content; `pieces` replaces the SVGs.
- No internal legality check — the parent owns the truth via `position`.

### Click-to-move example

```tsx
const [selected, setSelected] = createSignal<string | null>(null);
const [position, setPosition] = createSignal(chess.fen());

<Chessboard
  options={{
    position: position(),
    squareStyles: selected() ? { [selected()!]: { 'background-color': 'rgba(255, 255, 0, 0.4)' } } : {},
    onSquareClick: ({ square, piece }) => {
      const from = selected();
      if (!from) {
        if (piece) setSelected(square);
        return;
      }
      try {
        chess.move({ from, to: square, promotion: 'q' });
        setPosition(chess.fen());
      } catch {
        /* illegal: fall through and reselect */
      }
      setSelected(piece ? square : null);
    },
  }}
/>;
```

### Spare pieces example

```tsx
import { ChessboardProvider, Chessboard, SparePiece } from 'solid-chessboard';

<ChessboardProvider options={{ position, onPieceDrop }}>
  <div style={{ display: 'flex', gap: '4px' }}>
    <For each={['wP', 'wN', 'wB', 'wR', 'wQ', 'wK']}>
      {type => (
        <div style={{ width: '60px' }}>
          <SparePiece pieceType={type} />
        </div>
      )}
    </For>
  </div>
  <Chessboard /> {/* already wrapped: renders bare <Board/> */}
</ChessboardProvider>;
```

---

## 8. Critical React → SolidJS Translation Rules

When porting or writing new code for this library, strictly follow these SolidJS paradigms:

| React concept | SolidJS equivalent | Why / notes |
|---|---|---|
| `useState` | `createSignal` | Fine-grained reactivity. Returns `[getter, setter]`; **call the getter** (`value()`). |
| `useEffect` | `createEffect` (or `onMount` for one-time setup) | Runs after render and automatically tracks the signals read inside it. No dependency array. |
| `useEffect` with `[dep]` | `createEffect(on(() => dep, fn))` | Use `on` for explicit dependencies; add `{ defer: true }` to skip the initial run. |
| Cleanup return in `useEffect` | `onCleanup(() => ...)` | Call inside the effect or component. |
| `useMemo` | `createMemo` | Returns a getter. Use for derived state such as `generateBoard`. |
| `useCallback` | *(nothing)* | Components run once; functions are not recreated. |
| `useContext` / `use(Context)` | `useContext` | Returns the value directly. |
| `React.memo(Component)` | `function Component(props)` | **Solid components run once and aren't re-rendered**, so `memo` is unnecessary. |
| `function Comp({ prop })` | `function Comp(props)` | **Never destructure props at the top level.** Access via `props.prop`, or use `mergeProps` / `splitProps` to preserve reactivity. |
| Default props via destructuring | `mergeProps(defaults, props)` | Keeps getters reactive. |
| `array.map()` in JSX | `<For each={array}>` | Keyed by reference, O(1) updates, no full list re-render. |
| `condition && <Comp />` / ternary | `<Show when={condition} fallback={...}>` | Solid control-flow component. |
| `useRef` | `let el!: HTMLElement;` + `<div ref={el} />` (or `ref={e => (x = e)}`) | Refs are plain variables assigned at creation. |
| `PropsWithChildren` | `ParentComponent` / `props: { children: JSX.Element }` | Use the `children()` helper if you need to resolve/inspect children. |
| `React.CSSProperties` | `JSX.CSSProperties` | Object **keys are kebab-case** (`'background-color'`). |
| `className` | `class` (or `classList`) | Solid uses native attribute names. |
| `onClick={...}` | `onClick={...}` | Same name; Solid delegates most events automatically. Use `on:click` for non-delegated native handlers. |
| `key` prop | *(not needed)* | `<For>` tracks by item reference. Use `<Index>` when items are primitives and positions matter. |
| Rollup build | `tsup` with `tsup-preset-solid` | The `solid-lib-starter` uses `tsup` and emits compiled and uncompiled JSX entries matching the `exports` map. |
| `pnpm` / `yarn` | `npm` | This project's package manager. |

---

## 9. Solid-Specific Pitfalls and Gotchas

1. **Components run once.** Anything computed at the top of a component body is *not* recalculated. Wrap derived values in `createMemo` or read them inside JSX / effects.
2. **Don't destructure props or context values.** `const { id } = props.options` freezes the value. Use `props.options.id` or a getter.
3. **Context exposes accessors.** Call them: `board()`, `draggingPiece()`, `positionDifferences()`.
4. **`<For>` item identity.** `board()` rows/squares must be *stable object references* between recomputations, otherwise `<For>` recreates DOM nodes. Memoize `generateBoard` and keep it free of side effects.
5. **Cleanup timers.** Every `setTimeout` (animation commit) and global listener (`window` `contextmenu`) must be paired with `onCleanup`, otherwise stale callbacks overwrite newer state.
6. **DOM measurement only in effects / `onMount`.** `document.querySelector` and `getBoundingClientRect` (in `Piece`, `isTouchEndWithinSquare`, `preventDragOffBoard`) must never run during component setup, since this breaks SSR.
7. **`style` object keys use kebab-case** and `undefined` values are skipped. Don't mix camelCase and kebab-case defaults.
8. **Mutable `chess.js` instance.** `chess.js` mutates in place, so signals holding it won't notify. Hold the *FEN string* in a signal (as in the workflow example), or use `createSignal(chess, { equals: false })` and call the setter after each move.
9. **Event delegation.** Solid delegates `click`, `mousedown`, `mouseup`, `touchstart`, etc. to `document`. If a third-party layer calls `stopPropagation` on native events, delegated handlers will not fire; use `on:click` when you need native listeners.
10. **Dev vs prod entry.** When testing the built package inside another Vite app, make sure `vite-plugin-solid` is installed there so the `solid` export condition (`index.jsx`) is compiled by the consumer.
11. **Bundle externals.** Keep `solid-js` and `solid-js/web` external (the preset does this); bundling them breaks reactivity because two Solid runtimes would exist.

---

## 10. SSR / SolidStart Notes

- The first render must be deterministic and DOM-free: `Board`, `Square` and `Piece` render purely from signals/props. Anything touching `window` / `document` goes in `onMount` or `createEffect` (which don't run on the server).
- Pieces are inline SVG, so no asset loading is needed and there is no hydration mismatch from images.
- Drag-and-drop listeners attach after hydration. The board is visible and static until then.
- In **SolidStart**, no special wrapper is needed. If `@dnd-kit/solid` accesses browser globals at import time, load the board with `clientOnly` from `@solidjs/start` or `lazy()`:

  ```tsx
  import { clientOnly } from '@solidjs/start';
  const Chessboard = clientOnly(() => import('solid-chessboard').then(m => ({ default: m.Chessboard })));
  ```

- `npm run test:ssr` should render a default board with `renderToString` and assert that 64 squares and 32 pieces are present.

---

## 11. Testing Strategy

| Layer | File | What to assert |
|---|---|---|
| Pure utils | `test/utils.test.ts` | `generateBoard` for both orientations and non-8×8 sizes; `fenStringToPositionObject` (start FEN, partial FEN, extra FEN fields ignored); row/column index conversions are inverses; `getPositionUpdates` for pawn push, capture, knight, castling (both sides), en passant; `getPromotionUpdates` for promotion and reversal. |
| Rendering | `test/Chessboard.test.tsx` | 64 squares, 32 pieces for the start position; `boardOrientation: 'black'` flips notation; `showNotation: false` hides notation; custom `pieces` and `squareRenderer` are used. |
| Interaction | `test/Chessboard.test.tsx` | `onSquareClick` / `onPieceClick` args; right-drag draws then toggles an arrow; `onArrowsChange` fires; `onPieceDrop` returning `false` keeps the old position. |
| Reactivity | `test/Chessboard.test.tsx` | Updating the `position` signal changes only affected squares (spy on DOM mutations / node identity of unchanged squares). |
| SSR | `test/ssr.test.tsx` | `renderToString(() => <Chessboard />)` runs without touching `window`. |

Run with `npm test` (client + SSR in parallel).

---

## 12. Publishing Checklist

```bash
npm run lint            # eslint + tsc --noEmit
npm test                # client + SSR tests
npm run build           # tsup → dist/ (also runs automatically on prepublishOnly)
npm pack --dry-run      # verify only dist/, README, LICENSE, package.json are included
npm version patch       # or minor / major
npm publish --access public
```

- Confirm the `exports` map printed by `tsup` matches `package.json`.
- Confirm `dist/` contains `index.js`, `dev.js`, `index.jsx`, `dev.jsx` and `index.d.ts`.
- Ensure `README.md` documents installation (`npm install solid-chessboard solid-js`), the `ChessboardOptions` reference and the `chess.js` example.

---

## 13. Next Steps for Development

1. **Initialize**: run `npm install` to fetch the dependencies defined in `package.json` (this creates `package-lock.json`).
2. **Verify the dev environment**: run `npm run dev`. This starts `vite serve dev`. Create `dev/App.tsx` to test `<Chessboard />` locally.
3. **Port `types.ts`, `defaults.ts` and `utils.ts` first**: they are framework-agnostic. Copy them from the React version, converting `React.CSSProperties` → `JSX.CSSProperties`, camelCase style keys → kebab-case, and `ReactNode` / `JSX.Element` types to Solid's `JSX.Element`.
4. **Port `pieces.tsx`**: replace `React` SVG attributes with Solid's (e.g. `strokeWidth` → `stroke-width`, `className` → `class`).
5. **Build `ChessboardProvider.tsx`**: this is the heart of the library. Translate React state to `createSignal` / `createMemo`, use `mergeProps` for default options, and implement the position-diff effect with proper `onCleanup`.
6. **Implement `<For>` in `Board.tsx`**: replace `.map()` with nested `<For>` to leverage Solid's fine-grained updates.
7. **Add `Square`, `Piece`, `Draggable`, `Droppable`, `Arrows`, `SparePiece`**, in that order, validating each in the playground.
8. **Port the sensors and `modifiers.ts`** against the installed `@dnd-kit/solid` / `@dnd-kit/dom` API.
9. **Write tests** (see §11) and run `npm test` and `npm run lint`.
10. **Build**: run `npm run build`. `tsup` will read `tsup-preset-solid` and generate the `dist/` folder matching your `exports` configuration (`index.js`, `dev.js`, `index.jsx`, `dev.jsx`, `index.d.ts`).