/**
 * Motion tokens. Durations come from the reference (`motion.ts` in app.aave.com and the
 * `--duration-*` / `--ease-*` variables in pro.aave.com). Keeping them in one place means every
 * transition in both apps uses the same vocabulary, and the global reduced-motion rule (in the
 * theme's CssBaseline) can neutralise all of them at once.
 */
export const motion = {
  duration: {
    /** Dropdowns, menus, selects, popovers. */
    overlay: 100,
    /** Button and control hover/focus feedback. */
    hover: 100,
    /** Larger hover fades. */
    hoverSlow: 150,
    /** Modal enter/exit (the reference reserves this token; we use it). */
    modal: 200,
    /** Pro: snappy springs. */
    snappy: 220,
    /** Pro: smooth layout changes (sidebar, drawers). */
    smooth: 300,
  },
  easing: {
    standard: 'ease',
    /** Long, soft deceleration (reference `smooth`). */
    smooth: 'cubic-bezier(0.19, 1, 0.22, 1)',
    /** Slight overshoot used by Pro for pops. */
    snappy: 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
  },
} as const;

export const transition = (props: string[], ms: number = motion.duration.hover, easing: string = motion.easing.standard) =>
  props.map((p) => `${p} ${ms}ms ${easing}`).join(', ');
