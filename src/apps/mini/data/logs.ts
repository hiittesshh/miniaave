/**
 * §10: "the public RPC may limit how many blocks one log query can cover. Start from the deployment
 * block and query in chunks if you get a range error."
 *
 * `fetchInChunks` walks [from, to] in spans of `chunk` blocks, one after another, and halves the
 * span whenever the RPC answers with a range / too-many-results error. Any other error is thrown.
 */

const RANGE_ERROR = /range|too many|exceed|10000|block.?span|query returned more/i;

export function isRangeError(e: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; cur && i < 6; i++) {
    const o = cur as { message?: unknown; details?: unknown; shortMessage?: unknown; cause?: unknown };
    for (const v of [o.message, o.details, o.shortMessage]) if (typeof v === 'string') parts.push(v);
    cur = o.cause;
  }
  return RANGE_ERROR.test(parts.join(' | '));
}

const RATE_LIMIT = /rate.?limit|request limit|too many requests|429|-32007|exceeded.*per second|\/second/i;

/** "Slow down" answers from public RPCs (HTTP 429, "25/second request limit reached", …). */
export function isRateLimitError(e: unknown): boolean {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let i = 0; cur && i < 6; i++) {
    const o = cur as { message?: unknown; details?: unknown; shortMessage?: unknown; status?: unknown; code?: unknown; cause?: unknown };
    for (const v of [o.message, o.details, o.shortMessage]) if (typeof v === 'string') parts.push(v);
    if (o.status === 429 || o.code === -32007 || o.code === 429) return true;
    cur = o.cause;
  }
  return RATE_LIMIT.test(parts.join(' | '));
}

/**
 * Scan [from, to] in `span`-block windows, `perWave` windows at a time (fired together, so the
 * transport sends them as one JSON-RPC batch), at most one wave per `waveMs`. A rate-limited wave
 * waits and retries (up to `retries` times). After each wave `onProgress(doneThrough, results)` gets
 * the contiguous block reached so far and that wave's logs, so a caller can save partial progress.
 * Public Base Sepolia (measured 2026-10-19): eth_getLogs ≤ 200 blocks, ≤ 25 requests / second.
 */
export async function scanLogs<T>(opts: {
  from: bigint;
  to: bigint;
  span: bigint;
  perWave: number;
  waveMs: number;
  fetchRange: (from: bigint, to: bigint) => Promise<T[]>;
  /** After each wave: the contiguous block reached, and the logs this wave found. May be async. */
  onProgress?: (doneThrough: bigint, waveFound: T[], doneWindows: number, totalWindows: number) => void | Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  retries?: number;
  now?: () => number;
}): Promise<T[]> {
  const { from, to, span, perWave, waveMs, fetchRange, onProgress, retries = 6 } = opts;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? (() => Date.now());
  const windows: [bigint, bigint][] = [];
  for (let a = from; a <= to; a += span) windows.push([a, a + span - 1n < to ? a + span - 1n : to]);
  const out: T[] = [];
  for (let i = 0; i < windows.length; i += perWave) {
    const wave = windows.slice(i, i + perWave);
    let found: T[] = [];
    for (let attempt = 0; ; attempt++) {
      const started = now();
      try {
        const results = await Promise.all(wave.map(([a, b]) => fetchInChunks(a, b, fetchRange, span)));
        found = results.flat();
        out.push(...found);
        const elapsed = now() - started;
        if (i + perWave < windows.length && elapsed < waveMs) await sleep(waveMs - elapsed);
        break;
      } catch (e) {
        if (!isRateLimitError(e) || attempt >= retries) throw e;
        await sleep(waveMs * (attempt + 1));
      }
    }
    await onProgress?.(wave[wave.length - 1][1], found, Math.min(i + perWave, windows.length), windows.length);
  }
  return out;
}

export async function fetchInChunks<T>(from: bigint, to: bigint, fetch: (from: bigint, to: bigint) => Promise<T[]>, chunk: bigint, minChunk = 1n): Promise<T[]> {
  const out: T[] = [];
  let start = from;
  let span = chunk < 1n ? 1n : chunk;
  while (start <= to) {
    const end = start + span - 1n < to ? start + span - 1n : to;
    try {
      out.push(...(await fetch(start, end)));
      start = end + 1n;
    } catch (e) {
      if (!isRangeError(e) || span <= minChunk) throw e;
      span = span / 2n > minChunk ? span / 2n : minChunk;
    }
  }
  return out;
}
