/**
 * §9 for real chains: turn whatever viem / wagmi / the wallet throws into the SAME error classes the
 * mock engine throws, so the UI (`messageFor`) needs no chain-specific code.
 *
 *   user rejected in the wallet (UserRejectedRequestError, or EIP-1193 code 4001) → UserRejectedError
 *   revert decoded by name (ContractFunctionRevertedError.data.errorName)         → MiniContractError(name)
 *   revert we can't name (unknown selector, require string, panic)               → TxRevertedError
 *   anything else (RPC down, wrong chain, …)                                      → passed through (generic message)
 *
 * Names decode only if the ABI used for the call contains the error. That's why pool calls use
 * `poolDecodingAbi` (pool + token + oracle errors, see abis/index.ts).
 */
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';
import { MiniContractError, TxRevertedError, UserRejectedError, isMiniErrorName } from '../lib/errors';

const hasCode = (e: unknown, code: number) => typeof e === 'object' && e !== null && (e as { code?: unknown }).code === code;

export function decodeChainError(err: unknown): Error {
  if (err instanceof MiniContractError || err instanceof UserRejectedError || err instanceof TxRevertedError) return err;
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError || hasCode(e, 4001))) return new UserRejectedError();
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (isMiniErrorName(name)) return new MiniContractError(name);
      return new TxRevertedError(name ?? revert.signature ?? revert.reason);
    }
    return err;
  }
  // Some wallets reject with a bare EIP-1193 object: { code: 4001, message }.
  if (hasCode(err, 4001)) return new UserRejectedError();
  return err instanceof Error ? err : new Error(String(err));
}
