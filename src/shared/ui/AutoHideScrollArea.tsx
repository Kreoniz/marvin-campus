import { ScrollArea, type ScrollAreaRootProps } from 'unlikely-ui/scroll-area';

const visibilityClasses = [
  '[&>.u-scrollbar]:opacity-0',
  '[&>.u-scrollbar]:transition-opacity',
  '[&>.u-scrollbar]:duration-200',
  '[&>.u-scrollbar]:delay-700',
  '[&:is(:has(:focus-visible),[data-scrolling],:has(>.u-scrollbar[data-hovering]),:has(>.u-scrollbar:active))>.u-scrollbar]:opacity-100',
  '[&:is(:has(:focus-visible),[data-scrolling],:has(>.u-scrollbar[data-hovering]),:has(>.u-scrollbar:active))>.u-scrollbar]:delay-0',
  'motion-reduce:[&>.u-scrollbar]:transition-none',
  'forced-colors:[&>.u-scrollbar[data-orientation]]:opacity-100',
].join(' ');

/**
 * Drop-in Root with the usual Viewport, Content and direct-child Scrollbars.
 * Base UI holds data-scrolling for 500 ms after user scrolling; CSS adds a
 * 700 ms idle delay before fading. Hover, keyboard focus and a held scrollbar
 * stay visible; focus left by a click or tap does not keep idle bars on screen.
 * Only opacity changes: the library's overlay geometry and padding stay intact.
 */
export default function AutoHideScrollArea({
  className,
  ...props
}: ScrollAreaRootProps) {
  return (
    <ScrollArea.Root
      {...props}
      className={(state) =>
        [
          visibilityClasses,
          typeof className === 'function' ? className(state) : className,
        ]
          .filter(Boolean)
          .join(' ')
      }
    />
  );
}
