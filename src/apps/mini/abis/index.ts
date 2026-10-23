/**
 * The three Mini-Aave ABIs, plus the combined ABI used to decode reverts (§9: "simulate with the
 * pool ABI plus the token's errors", so ERC20InsufficientAllowance thrown by the token inside a
 * pool call comes back by name). The oracle's errors are added too, for setPrice.
 */
import { erc20Abi, erc20Errors } from './erc20';
import { oracleAbi } from './oracle';
import { poolAbi } from './pool';

export { erc20Abi, erc20Errors, oracleAbi, poolAbi };

const oracleErrors = oracleAbi.filter((x) => x.type === 'error' && x.name !== 'OwnableUnauthorizedAccount' && x.name !== 'OwnableInvalidOwner');

/** Pool ABI + token errors + oracle errors: what simulate / write use for pool calls. */
export const poolDecodingAbi = [...poolAbi, ...erc20Errors, ...oracleErrors] as const;
