/**
 * Compare a reconstructed ABI with the real one (used by __tests__/abi-check.test.ts).
 *
 * What must match, item by item (functions, events, errors we rely on):
 *  - the signature `name(type,…)` and therefore the selector / event topic. A different selector
 *    means calls, reverts and logs would not decode at all.
 *  - functions: the output types AND names (viem turns struct fields into object keys) and the
 *    state mutability (view vs nonpayable decides read vs write).
 *  - events: which fields are indexed, and the field names (they become `args.<name>`).
 * Items that only the real ABI has are reported as notes, not failures: we just don't use them.
 */
import { keccak256, toBytes } from 'viem';

export interface AbiParam {
  name?: string;
  type: string;
  indexed?: boolean;
  components?: readonly AbiParam[];
}
export interface AbiEntry {
  type: string;
  name?: string;
  inputs?: readonly AbiParam[];
  outputs?: readonly AbiParam[];
  stateMutability?: string;
}

/** Canonical Solidity type: tuples expanded, e.g. `(address,uint8)[]`. */
export function canonicalType(p: AbiParam): string {
  if (p.type.startsWith('tuple')) return `(${(p.components ?? []).map(canonicalType).join(',')})${p.type.slice('tuple'.length)}`;
  return p.type;
}

/** Type with field names, for outputs / event args where names matter: `(address asset,uint8 decimals)`. */
export function namedType(p: AbiParam): string {
  const inner = p.type.startsWith('tuple') ? `(${(p.components ?? []).map(namedType).join(',')})${p.type.slice('tuple'.length)}` : p.type;
  return p.name ? `${inner} ${p.name}` : inner;
}

export const signatureOf = (e: AbiEntry) => `${e.name}(${(e.inputs ?? []).map(canonicalType).join(',')})`;

export function selectorOf(e: AbiEntry): string {
  const hash = keccak256(toBytes(signatureOf(e)));
  return e.type === 'event' ? hash : hash.slice(0, 10);
}

const KINDS = new Set(['function', 'event', 'error']);
const label = (e: AbiEntry) => `${e.type} ${signatureOf(e)}`;

/** Accepts a bare ABI array or a Foundry / Hardhat artifact `{ abi: [...] }`. */
export function abiFromJson(json: unknown): AbiEntry[] {
  const arr = Array.isArray(json) ? json : (json as { abi?: unknown })?.abi;
  if (!Array.isArray(arr)) throw new Error('Not an ABI: expected an array or an object with an "abi" array');
  return arr as AbiEntry[];
}

export interface AbiDiff {
  /** Differences that would break the app: fix the reconstructed ABI (or just use the real one). */
  problems: string[];
  /** Real-only items, for information. */
  notes: string[];
}

export function compareAbis(reconstructed: readonly AbiEntry[], real: readonly AbiEntry[]): AbiDiff {
  const problems: string[] = [];
  const notes: string[] = [];
  const ours = reconstructed.filter((e) => KINDS.has(e.type));
  const theirs = real.filter((e) => KINDS.has(e.type));

  for (const e of ours) {
    const sameSig = theirs.find((r) => r.type === e.type && signatureOf(r) === signatureOf(e));
    if (!sameSig) {
      const sameName = theirs.filter((r) => r.type === e.type && r.name === e.name);
      problems.push(
        sameName.length
          ? `${label(e)} [selector ${selectorOf(e)}] differs from the real ${sameName.map((r) => `${signatureOf(r)} [selector ${selectorOf(r)}]`).join(' / ')}`
          : `${label(e)} [selector ${selectorOf(e)}] is missing from the real ABI`,
      );
      continue;
    }
    if (e.type === 'function') {
      const outs = (x: AbiEntry) => (x.outputs ?? []).map(namedType).join(', ');
      if (outs(e) !== outs(sameSig)) problems.push(`${label(e)} returns (${outs(e)}) here but (${outs(sameSig)}) in the real ABI`);
      if ((e.stateMutability ?? '') !== (sameSig.stateMutability ?? '')) problems.push(`${label(e)} is ${e.stateMutability} here but ${sameSig.stateMutability} in the real ABI`);
    }
    if (e.type === 'event') {
      const args = (x: AbiEntry) => (x.inputs ?? []).map((p) => `${p.indexed ? 'indexed ' : ''}${namedType(p)}`).join(', ');
      if (args(e) !== args(sameSig)) problems.push(`${label(e)} fields (${args(e)}) here but (${args(sameSig)}) in the real ABI`);
    }
  }
  for (const r of theirs) {
    if (!ours.some((e) => e.type === r.type && signatureOf(e) === signatureOf(r))) notes.push(`only in the real ABI: ${label(r)}`);
  }
  return { problems, notes };
}
