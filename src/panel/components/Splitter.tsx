import type { KeyboardEvent, PointerEvent } from 'react';

interface SplitterProps {
  /** `vertical` draws a vertical bar that resizes the width of the element before it. */
  orientation: 'vertical' | 'horizontal';
  label: string;
  min: number;
  /** Space kept free for the element after the splitter. */
  reserve: number;
  onResize: (size: number) => void;
  onReset: () => void;
}

const KEYBOARD_STEP = 16;

export function Splitter({ orientation, label, min, reserve, onResize, onReset }: SplitterProps) {
  const isVertical = orientation === 'vertical';

  const measure = (splitter: HTMLElement) => {
    const target = splitter.previousElementSibling?.getBoundingClientRect();
    const container = splitter.parentElement?.getBoundingClientRect();
    const size = (isVertical ? target?.width : target?.height) ?? min;
    const available = (isVertical ? container?.width : container?.height) ?? size + reserve;
    return { size, max: Math.max(min, available - reserve) };
  };
  const clamp = (value: number, max: number) => Math.min(Math.max(value, min), max);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const splitter = event.currentTarget;
    const { size, max } = measure(splitter);
    const start = isVertical ? event.clientX : event.clientY;
    splitter.setPointerCapture(event.pointerId);
    document.documentElement.dataset.resizing = orientation;

    const handleMove = (move: globalThis.PointerEvent) => {
      onResize(clamp(size + (isVertical ? move.clientX : move.clientY) - start, max));
    };
    const handleEnd = () => {
      delete document.documentElement.dataset.resizing;
      splitter.removeEventListener('pointermove', handleMove);
      splitter.removeEventListener('lostpointercapture', handleEnd);
    };
    splitter.addEventListener('pointermove', handleMove);
    splitter.addEventListener('lostpointercapture', handleEnd);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const { size, max } = measure(event.currentTarget);
    onResize(clamp(size + step * KEYBOARD_STEP, max));
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      title="Drag to resize, double-click to reset"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={onReset}
      className={`relative z-30 shrink-0 touch-none bg-line hover:bg-accent focus-visible:bg-accent focus-visible:outline-none ${
        isVertical ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize'
      }`}
    >
      <span
        className={`absolute ${isVertical ? '-inset-x-1 inset-y-0' : '-inset-y-1 inset-x-0'}`}
      />
    </div>
  );
}
