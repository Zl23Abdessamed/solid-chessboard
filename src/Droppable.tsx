import type { Accessor, JSX } from 'solid-js';
import { useDroppable } from '@dnd-kit/solid';

export type DroppableState = {
  /**
   * Accessor returning whether a dragged piece is over this square. Passed
   * as an accessor (instead of a plain boolean) so consumers such as
   * `Square` stay mounted across hover changes and update fine-grained.
   */
  isOver: Accessor<boolean>;
};

type DroppableProps = {
  children: (state: DroppableState) => JSX.Element;
  squareId: string;
};

export function Droppable(props: DroppableProps) {
  const { ref, isDropTarget } = useDroppable({
    id: props.squareId,
  });

  // NOTE: `isDropTarget` is passed by reference (not called) so this JSX
  // expression never re-evaluates and children mount exactly once.
  return <div ref={ref}>{props.children({ isOver: isDropTarget })}</div>;
}
