/**
 * Builder B seed: Pro changelog entries.
 *
 * Dates, tags, titles, slugs, which entries have an illustration, and each entry's block structure
 * (paragraphs, sub-headings, bullet lists, inline links/code) mirror the live /changelog page
 * (captured 2026-10-14). The body text is our own wording, written for this demo, not a copy of
 * the live prose; illustrations are drawn by the clone (pages/changelog/art.tsx).
 */

export type ChangelogBlock =
  | { type: 'p'; text: string; /** Inline link: the first occurrence of `label` becomes a link. */ link?: { label: string; href: string }; code?: string }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] };

export interface ChangelogEntry {
  slug: string;
  date: string; // ISO day
  tag: 'New Feature' | 'New Release';
  title: string;
  art?: 'stocks' | 'arc' | 'avalanche' | 'rewards' | 'watch' | 'reserve';
  blocks: ChangelogBlock[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    slug: 'tokenised-stocks',
    date: '2026-09-25',
    tag: 'New Feature',
    title: 'Tokenised Stocks',
    art: 'stocks',
    blocks: [
      { type: 'p', text: 'Tokenised shares of well-known public companies can now be used in Pro, right next to the crypto assets you already hold.' },
      { type: 'h', text: 'What’s New' },
      {
        type: 'ul',
        items: [
          'Hold onchain versions of major listed public companies.',
          'Deposit supported shares to earn yield.',
          'Borrow against eligible shares as collateral.',
          'Stay exposed to the companies you like while unlocking liquidity.',
          'See your stocks and crypto assets side by side, all in one place.',
        ],
      },
      { type: 'p', text: 'Stocks broaden the set of real-world assets available in the app. Supported shares work like any other asset: you can deposit them, use them as collateral and include them in the positions you already manage, all from the same screens.' },
    ],
  },
  {
    slug: 'arc-now-available',
    date: '2026-09-16',
    tag: 'New Feature',
    title: 'Arc now available on Aave Pro',
    art: 'arc',
    blocks: [
      { type: 'p', text: 'Deposits, loans, withdrawals and repayments now work on Arc, the Layer-1 network from Circle built for stablecoin payments. Arc sits alongside Ethereum and Avalanche from its first day on mainnet.', link: { label: 'Arc', href: 'https://www.arc.io/' } },
      { type: 'p', text: 'Arc behaves like every other network in the app. Choose it in any deposit, borrow, withdraw or repay flow; each network lists its own balance and rate so you can compare them before confirming. Asset totals and your wallet balances are combined across all networks, and the network picker lets you focus on Arc alone or look at everything together.' },
      { type: 'p', text: 'Pick an asset from the market to try Arc.' },
    ],
  },
  {
    slug: 'avalanche-now-available',
    date: '2026-07-15',
    tag: 'New Feature',
    title: "Avalanche now available on Aave Pro",
    art: 'avalanche',
    blocks: [
      { type: 'p', text: "Avalanche is now supported for supplying, borrowing, withdrawing and repaying. It is the first network added after Ethereum, so the app now works across more than one chain from today.", link: { label: 'Avalanche', href: 'https://www.avax.network/' } },
      { type: 'p', text: "Every transaction flow now asks which network to use, and it shows the balance and the current rate for each option, so you can compare them before you confirm anything." },
      { type: 'p', text: "Assets keep a single page that covers every network they live on. Totals, deposits, borrows and rates are combined, and you can narrow the view to one network whenever you want the detail for that chain on its own." },
      { type: 'p', text: "Your wallet balance for an asset is added up across networks, so moving between chains never splits what you see on screen. Open any asset from the market and pick Avalanche to get started." },
    ],
  },
  {
    slug: 'merkl-rewards',
    date: '2026-05-20',
    tag: 'New Feature',
    title: "Merkl Rewards",
    art: 'rewards',
    blocks: [
      { type: 'p', text: "Reward campaigns distributed through Merkl now appear throughout the app. Campaigns raise the APY you earn on deposits or lower the rate you pay on your loans." },
      { type: 'h', text: "Rewards on Every Market" },
      { type: 'p', text: "Each reserve page now lists the reward campaigns running on that market, which side of the market they apply to, and when each one ends. APYs in tables and on asset pages already include campaign rewards and carry a small badge; hover over it to see base yield and rewards." },
      { type: 'h', text: "One Place to Claim" },
      { type: 'p', text: "The dashboard now has a Rewards section that lists every reward you have built up across all of your markets, ready to claim together. Claiming happens in a single transaction straight from that section, and the totals refresh as soon as it confirms, so you can always see exactly what is left to claim later." },
      { type: 'p', text: "Open the dashboard to see what you can claim right now, or open a reserve to browse its active campaigns." },
    ],
  },
  {
    slug: 'watch-wallets',
    date: '2026-05-06',
    tag: 'New Feature',
    title: "Watch Wallets",
    art: 'watch',
    blocks: [
      { type: 'p', text: "You can now follow any Ethereum address without connecting it first. A watched wallet shows its positions, balances and full history in read-only mode, just like your own." },
      { type: 'h', text: "Follow Any Address" },
      { type: 'p', text: "Paste an address or an ENS name such as vitalik.eth to start watching it. Watched wallets appear in the wallet menu, and choosing one switches the whole app to that wallet's view: its positions, health factors, activity and rewards. Watching an address never asks you for a signature or any permission at all.", code: 'vitalik.eth' },
      { type: 'h', text: "Name Your Wallets" },
      { type: 'p', text: "Give any wallet, watched or connected, a custom name and a picture so the right one is always easy to spot. Names and pictures are saved in this browser only, they are never shared, and you can change or remove them at any time." },
      { type: 'h', text: "Moving Between Wallets" },
      { type: 'p', text: "The wallet menu now lists your connected wallet and the wallets you watch in two separate groups, so you can jump between them in a single click and always know which wallet the app is currently showing." },
    ],
  },
  {
    slug: 'new-reserves-page',
    date: '2026-04-25',
    tag: 'New Feature',
    title: "Reserve Page",
    art: 'reserve',
    blocks: [
      { type: 'p', text: "Every market reserve now has its own page with live parameters, rate history, collateral settings and the largest holders. It brings together what you need to judge a market before you deposit or borrow, and shows your position there once a wallet is connected." },
      { type: 'h', text: "Follow the Rates" },
      { type: 'p', text: "Deposit and borrow APYs are charted over time, from a single day to all time. The interest rate model is drawn as a curve with the optimal utilisation and the current point marked, so you can see how close the market is to its kink and how a large deposit or loan would move the rate for everyone in it." },
      { type: 'h', text: "Collateral at a Glance" },
      { type: 'p', text: "The page lists which assets can be borrowed against this reserve and which collateral the market accepts, with the collateral factor and the risk setting for each one. Liquidation penalty, target health factor and capacity limits sit right next to them, so the full risk picture of a market is on one screen instead of being spread across documentation, governance posts and third-party dashboards." },
      { type: 'h', text: "Market and Position Together" },
      { type: 'p', text: "Totals, available liquidity and capacity bars show how full the market currently is at any moment, while the top holders list shows how concentrated its deposits and loans are. When you connect a wallet, your own deposits, loans and health factor for this market appear right alongside them, and the deposit and borrow buttons open the correct transaction flow already set to this reserve, so there is nothing else to pick." },
      { type: 'p', text: "Open any reserve from the market to start exploring it." },
    ],
  },
  {
    slug: 'mainnet-release',
    date: '2026-03-30',
    tag: 'New Release',
    title: "Mainnet Release",
    blocks: [
      { type: 'p', text: "Pro is now live on mainnet. After months of testing with the community, the full interface for the new protocol is now available with real assets on Ethereum." },
      { type: 'h', text: "Getting Started" },
      { type: 'p', text: "Deposit to earn, borrow against your collateral, manage several positions across markets and watch your health factor. Every market shows its rates, limits and risk settings up front, and every transaction previews what will change before you sign." },
      { type: 'h', text: "Built With Feedback" },
      { type: 'p', text: "Testnet users reported bugs, questioned design choices and asked for the features that made it into this release. Thank you to everyone who tried the early builds, filed issues and told us what worked and what did not; that feedback shaped every part of this version, from the dashboard to the flows." },
    ],
  },
  {
    slug: 'devnet-release',
    date: '2025-11-25',
    tag: 'New Release',
    title: "Developer Preview",
    blocks: [
      { type: 'p', text: "A first preview of Pro, the interface for the next version of the protocol, is now available on testnet. Connect a wallet, use test assets and try the new position model before anything goes live with real funds." },
      { type: 'h', text: "A Fresh Interface for a Fresh Design" },
      { type: 'p', text: "The new protocol pools liquidity in hubs and keeps every user position in a market of its own, each with separate risk settings. The interface is built around that idea from the very start: you can supply and borrow in several markets at once, follow each position on its own, and see exactly how collateral quality and the risk premium change the rate you pay on loans." },
      { type: 'h', text: "Testnet First" },
      { type: 'p', text: "This preview runs only on testnet. Releasing it early lets the community explore the flows, test the edge cases and tell us what feels unclear before mainnet. If something breaks or could be better, please let us know." },
    ],
  },
];
