'use client';

import * as React from 'react';
import { Transition, type TransitionStatus } from 'react-transition-group';
import { motion } from './motion';

/**
 * Overlay transition: opacity 0→1 and scale 0.96→1. It is the same feel as the reference's
 * dropdowns ("a fast, subtle pop"), written from scratch. Wired as the default transition for
 * MUI menus and popovers in the theme, and reused for modals with a longer duration.
 *
 * It clones its single child instead of wrapping it, so MUI's Popover can still set the
 * anchor-based `transform-origin` on the paper.
 */
export interface ScaleFadeProps {
  in?: boolean;
  appear?: boolean;
  timeout?: number | { enter?: number; exit?: number } | 'auto';
  children: React.ReactElement<{ style?: React.CSSProperties; ref?: React.Ref<HTMLElement> }>;
  onEnter?: (node: HTMLElement, isAppearing: boolean) => void;
  /** MUI Popover positions its paper here; it must be forwarded or the menu stays invisible. */
  onEntering?: (node: HTMLElement, isAppearing: boolean) => void;
  onEntered?: (node: HTMLElement, isAppearing: boolean) => void;
  onExiting?: (node: HTMLElement) => void;
  onExit?: (node: HTMLElement) => void;
  onExited?: (node: HTMLElement) => void;
  style?: React.CSSProperties;
  /** Starting scale. Modals use a slightly smaller start (0.97) than menus (0.96). */
  fromScale?: number;
  easing?: string;
}

const resolve = (timeout: ScaleFadeProps['timeout'], mode: 'enter' | 'exit') => {
  if (typeof timeout === 'number') return timeout;
  if (timeout && typeof timeout === 'object') return timeout[mode] ?? motion.duration.overlay;
  return motion.duration.overlay;
};

export const ScaleFade = React.forwardRef<HTMLElement, ScaleFadeProps>(function ScaleFade(props, ref) {
  const {
    children,
    in: inProp,
    appear = true,
    timeout = motion.duration.overlay,
    style,
    fromScale = 0.96,
    easing = motion.easing.standard,
    onEnter,
    onEntering,
    onEntered,
    onExiting,
    onExit,
    onExited,
  } = props;
  const nodeRef = React.useRef<HTMLElement | null>(null);

  const setRefs = (node: HTMLElement | null) => {
    nodeRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    const childRef = (children.props as { ref?: React.Ref<HTMLElement> }).ref;
    if (typeof childRef === 'function') childRef(node);
    else if (childRef && typeof childRef === 'object') (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  const enter = resolve(timeout, 'enter');
  const exit = resolve(timeout, 'exit');

  const open: Partial<Record<TransitionStatus, React.CSSProperties>> = {
    entering: { opacity: 1, transform: 'scale(1)' },
    entered: { opacity: 1, transform: 'scale(1)' },
  };

  return (
    <Transition
      nodeRef={nodeRef}
      appear={appear}
      in={inProp}
      timeout={{ enter, exit }}
      onEnter={(isAppearing: boolean) => {
        const node = nodeRef.current;
        if (!node) return;
        void node.scrollTop; // force reflow so the "from" state paints first
        node.style.transition = `opacity ${enter}ms ${easing}, transform ${enter}ms ${easing}`;
        onEnter?.(node, isAppearing);
      }}
      onEntering={(isAppearing: boolean) => nodeRef.current && onEntering?.(nodeRef.current, isAppearing)}
      onEntered={(isAppearing: boolean) => nodeRef.current && onEntered?.(nodeRef.current, isAppearing)}
      onExiting={() => nodeRef.current && onExiting?.(nodeRef.current)}
      onExit={() => {
        const node = nodeRef.current;
        if (!node) return;
        node.style.transition = `opacity ${exit}ms ${easing}, transform ${exit}ms ${easing}`;
        onExit?.(node);
      }}
      onExited={() => nodeRef.current && onExited?.(nodeRef.current)}
    >
      {(state: TransitionStatus) =>
        React.cloneElement(children, {
          style: {
            opacity: 0,
            transform: `scale(${fromScale})`,
            visibility: state === 'exited' && !inProp ? 'hidden' : undefined,
            ...open[state],
            ...style,
            ...children.props.style,
          },
          ref: setRefs,
        })
      }
    </Transition>
  );
});
