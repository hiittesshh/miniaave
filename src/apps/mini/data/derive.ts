/** Small pure helpers over contract data (no state). */
import type { Address, MiniEvent } from './types';

/** Unique `user` addresses from Borrow events, in first-seen order (§11 step 1). */
export function borrowersFromEventsList(events: MiniEvent[]): Address[] {
  const seen = new Map<string, Address>();
  for (const e of events) if (e.eventName === 'Borrow' && !seen.has(e.args.user.toLowerCase())) seen.set(e.args.user.toLowerCase(), e.args.user);
  return [...seen.values()];
}
