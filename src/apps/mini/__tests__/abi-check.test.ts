/**
 * ABI CHECK: are the reconstructed ABIs (src/apps/mini/abis/*.ts) the same as the real ones?
 *
 * Drop the real files from `aave/handoff/abis/` into `src/apps/mini/abis/real/` (or point
 * MINI_REAL_ABI_DIR at that folder) and run:   npx vitest run abi-check
 * Missing real files → the comparison is skipped (passes with a note). The comparator itself is
 * always tested below, so the check can't silently pass by being broken.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { erc20Abi, oracleAbi, poolAbi } from '../abis';
import { abiFromJson, compareAbis, selectorOf, signatureOf, type AbiEntry } from '../abis/compare';

const DIR = process.env.MINI_REAL_ABI_DIR ? resolve(process.env.MINI_REAL_ABI_DIR) : resolve(__dirname, '../abis/real');

const PAIRS: { file: string; ours: readonly AbiEntry[] }[] = [
  { file: 'LendingPool.json', ours: poolAbi as unknown as AbiEntry[] },
  { file: 'MockERC20.json', ours: erc20Abi as unknown as AbiEntry[] },
  { file: 'MockOracle.json', ours: oracleAbi as unknown as AbiEntry[] },
];

describe('ABI check against the real aave/handoff/abis', () => {
  for (const { file, ours } of PAIRS) {
    const path = join(DIR, file);
    if (!existsSync(path)) {
      it(`${file}: not present, skipped`, () => {
        console.info(`[abi-check] ${path} not found: comparison skipped. Copy aave/handoff/abis/${file} there to run it.`);
        expect(existsSync(path)).toBe(false);
      });
      continue;
    }
    it(`${file} matches the reconstructed ABI`, () => {
      const { problems, notes } = compareAbis(ours, abiFromJson(JSON.parse(readFileSync(path, 'utf8'))));
      if (notes.length) console.info(`[abi-check] ${file}\n  ${notes.join('\n  ')}`);
      expect(problems, `\n${file}: the reconstructed ABI differs from the real one:\n  - ${problems.join('\n  - ')}\n`).toEqual([]);
    });
  }
});

describe('ABI comparator (always runs)', () => {
  const ours = poolAbi as unknown as AbiEntry[];
  const clone = () => JSON.parse(JSON.stringify(ours)) as AbiEntry[];

  it('an identical ABI (also as a Foundry artifact) has no problems', () => {
    expect(compareAbis(ours, abiFromJson({ abi: clone() })).problems).toEqual([]);
  });

  it('known selectors are computed correctly', () => {
    const supply = ours.find((e) => e.name === 'supply')!;
    expect(signatureOf(supply)).toBe('supply(address,uint256)');
    // ERC-20 approve(address,uint256) is the well-known 0x095ea7b3.
    expect(selectorOf((erc20Abi as unknown as AbiEntry[]).find((e) => e.name === 'approve')!)).toBe('0x095ea7b3');
    // Transfer(address,address,uint256) topic is the well-known 0xddf252ad….
    expect(selectorOf((erc20Abi as unknown as AbiEntry[]).find((e) => e.name === 'Transfer')!)).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
  });

  it('catches a different struct field type (ltv uint16 → uint256)', () => {
    const real = clone();
    const out = real.find((e) => e.name === 'getReserveData')!.outputs![0];
    (out.components as { name?: string; type: string }[]).find((c) => c.name === 'ltv')!.type = 'uint256';
    expect(compareAbis(ours, real).problems.join('\n')).toMatch(/getReserveData.*returns/);
  });

  it('catches an error with arguments (selector change) and a missing function', () => {
    const real = clone().filter((e) => e.name !== 'oracle');
    real.find((e) => e.name === 'AssetNotListed')!.inputs = [{ name: 'asset', type: 'address' }];
    const { problems } = compareAbis(ours, real);
    expect(problems.some((p) => p.includes('AssetNotListed()') && p.includes('AssetNotListed(address)'))).toBe(true);
    expect(problems.some((p) => p.includes('oracle()') && p.includes('missing'))).toBe(true);
  });

  it('catches a different indexed field and reports real-only items as notes', () => {
    const real = clone();
    real.find((e) => e.name === 'Supply')!.inputs!.find((p) => p.name === 'amount')!.indexed = true;
    real.push({ type: 'function', name: 'listReserve', inputs: [{ name: 'asset', type: 'address' }], outputs: [], stateMutability: 'nonpayable' });
    const { problems, notes } = compareAbis(ours, real);
    expect(problems.some((p) => p.startsWith('event Supply'))).toBe(true);
    expect(notes).toContain('only in the real ABI: function listReserve(address)');
  });
});
