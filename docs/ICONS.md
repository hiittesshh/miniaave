# Icons: every token, network and UI icon, with its source and licence

There is one shared `TokenIcon` component (`src/shared/ui/TokenIcon.tsx`) for both apps. It looks
up the symbol, case-insensitively, finds the matching file in `/public/tokens`, and falls back to a
plain circle in the token's brand colour. Nothing is copied from aave/interface or from the
pro.aave.com bundles. Guardrail: the site logo stays neutral, with the DEMO pill. Token logos for
AAVE and GHO are allowed because they come from an open set (coordinator, 2026-10-14).

## Token logos

| Token(s) | Source | Licence | File |
|---|---|---|---|
| ETH | web3icons 4.0.58 (`tokens/background`) | MIT | `tokens/eth.svg` |
| BTC, BTC.b | web3icons | MIT | `tokens/btc.svg` (BTC.b is "Bitcoin" in the live UI) |
| WBTC | web3icons | MIT | `tokens/wbtc.svg` |
| USDC | web3icons | MIT | `tokens/usdc.svg` |
| USDT / USDt | web3icons | MIT | `tokens/usdt.svg` |
| DAI | web3icons | MIT | `tokens/dai.svg` |
| EURC | web3icons | MIT | `tokens/eurc.svg` |
| LINK | web3icons | MIT | `tokens/link.svg` |
| XAUt | web3icons | MIT | `tokens/xaut.svg` |
| AVAX | web3icons | MIT | `tokens/avax.svg` |
| USDe | web3icons | MIT | `tokens/usde.svg` |
| PYUSD | web3icons | MIT | `tokens/pyusd.svg` |
| tBTC | web3icons | MIT | `tokens/tbtc.svg` |
| rETH | web3icons | MIT | `tokens/reth.svg` |
| cbETH | web3icons | MIT | `tokens/cbeth.svg` |
| LDO | web3icons | MIT | `tokens/ldo.svg` |
| ARB | web3icons | MIT | `tokens/arb.svg` |
| OP | web3icons | MIT | `tokens/op.svg` |
| GHO | web3icons | MIT | `tokens/gho.svg` |
| AAVE | web3icons | MIT | `tokens/aave.svg` |
| CRV | web3icons | MIT | `tokens/crv.svg` |
| BAL | cryptocurrency-icons 0.18.1 | CC0-1.0 | `tokens/bal.svg` |
| WETH, WETH.e | Trust Wallet assets: `ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | MIT | `tokens/weth.png` |
| wstETH | Trust Wallet: `ethereum/assets/0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` | MIT | `tokens/wsteth.png` |
| weETH | Trust Wallet: `ethereum/assets/0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee` | MIT | `tokens/weeth.png` |
| sUSDe | Trust Wallet: `ethereum/assets/0x9D39A5DE30e57443BfF2A8307A4256c8797A3497` | MIT | `tokens/susde.png` |
| USDG | Trust Wallet: `ethereum/assets/0xe343167631d89B6Ffc58B88d6b7fB0228795491D` | MIT | `tokens/usdg.png` |
| PAXG | Trust Wallet: `ethereum/assets/0x45804880De22913dAFE09f4980848ECE6EcbAf78` | MIT | `tokens/paxg.png` |
| sAVAX | Trust Wallet: `avalanchec/assets/0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE` | MIT | `tokens/savax.png` |
| AAPLc | simple-icons 16.35.0 `apple` (#000000) on a white disc | CC0-1.0 | `tokens/aaplc.svg` |
| GOOGLc | simple-icons `google` (#4285F4) on a white disc | CC0-1.0 | `tokens/googlc.svg` |
| METAc | simple-icons `meta` (#0467DF) on a white disc | CC0-1.0 | `tokens/metac.svg` |
| NVDAc | simple-icons `nvidia` (#76B900) on a white disc | CC0-1.0 | `tokens/nvdac.svg` |
| TSLAc | simple-icons `tesla` (#CC0000) on a white disc | CC0-1.0 | `tokens/tslac.svg` |

## Brand-colour circles (no open logo found; logged in PRO_DISCREPANCY_LOG #5)

Each was checked and found missing:
- web3icons 4.0.58: absent;
- Trust Wallet assets: 404 on ethereum and on the other chain folders tried;
- simple-icons: Amazon and Microsoft are not included.

No issuer press-kit terms were found that clearly allow reuse, so these stay as plain circles.

| Token | Circle colour |
|---|---|
| cbBTC | #0052FF (Coinbase blue) |
| LBTC | #1F5C55 |
| RLUSD | #1E6CF5 |
| frxUSD | #0B0B0B |
| syrupUSDC, syrupUSDG | #FF6A13 |
| cirBTC | #F7931A |
| MSFTc | #00A4EF |
| AMZNc | #FF9900 |
| anything else not listed | #6B6B6B (neutral grey) |

## Network logos

| Chain | Source | Licence | File |
|---|---|---|---|
| Ethereum, Base, Avalanche, Arc, Optimism | web3icons (`networks/background`) | MIT | `chain-icons/<slug>.svg` |

## UI icons (Pro)

Live Pro uses a custom 18×18 set with a 1.25px stroke, so not an open library. The clone uses
**lucide-react** (ISC) at 18px with an absolute 1.25px stroke (`src/apps/pro/icons.tsx`). The mapping
is logged in PRO_DISCREPANCY_LOG #12.

## Presentation (matched to the live captures)

- Explore table asset cell: 44px circle, no chain badge (the live table has none).
- Group heading: chain logo at 24px.
- Group "Assets" stack: 20px logos overlapping by 4px on a bg-2 disc, then "+N".
- Mobile card header: 44px.
- The live search dropdown shows a small chain badge on stock icons. Not yet reproduced (#13b).
