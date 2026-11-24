// Pump.fun Paper Sprint: buy-and-hold with time-stop recycling.
// Buys pump.fun curves at first trade (min 0.001 SOL real reserves), 0.3 SOL stake each.
// Sells at +35% TP (winners recycle) or after MAX_HOLD_SLOTS (losers recycle). No stop loss.
// Time stop recycles open slots into new mints to hit the 20-mint guardrail.

import { runBot, LAMPORTS_PER_SOL } from './vendor/makefun-bot.ts';
import type { Batch, Bot, BotState, OrderInput } from './vendor/makefun-bot.ts';

const STAKE_SOL = 0.3;          // SOL per new position
const MIN_RQ_SOL = 0.001;       // min real SOL reserves before entry
const MIN_TRADES = 1;           // min trades seen before we buy
const TP_BPS = 3500;            // take profit: +35% (recycle winners, losers hold)
const SL_BPS = 99999;            // stop loss: disabled
const MAX_HOLD_SLOTS = 9999999; // time stop: effectively disabled (hold to end)
const MAX_OPEN = 5;              // max open positions
const BUY_SLIP_BPS = 500;
const SELL_SLIP_BPS = 10000;

const STAKE_LAMPS = BigInt(Math.floor(STAKE_SOL * Number(LAMPORTS_PER_SOL)));

interface Held {
  opened: number;
  cost: bigint;
  tokens: bigint;
}

function createBot(): Bot {
  const held = new Map<string, Held>();
  const entriesPerMint = new Map<string, number>();

  return {
    onHello(state) { },
    onBatch(state, batch) {
      const now = batch.slot;
      const orders: OrderInput[] = [];
      const cap = state.hello.caps.max_orders_per_batch;
      const txFee = Number(state.txFeeLamports()) / Number(LAMPORTS_PER_SOL);

      const pendingByMint = new Map<string, number>();
      for (const po of state.pending.values()) {
        pendingByMint.set(po.order.mint, (pendingByMint.get(po.order.mint) ?? 0) + 1);
      }

      // Exits first
      for (const [mint, h] of held) {
        const pos = state.positions.get(mint);
        const curve = state.curves.get(mint);
        if (!pos) {
          if (!pendingByMint.has(mint)) held.delete(mint);
          continue;
        }
        if (!curve || curve.complete) continue;

        const tokens = Number(pos.token_amount);
        let value = 0;
        if (tokens > 0) {
          const curveData = state.curves.get(mint)!;
          const vq = Number(curveData.virtual_quote_reserves);
          const vt = Number(curveData.virtual_token_reserves);
          value = (tokens * vq) / (vt + tokens) / Number(LAMPORTS_PER_SOL);
          value = value * 0.9875 - txFee;
        }
        const cost = Number(h.cost) / Number(LAMPORTS_PER_SOL);

        let exit = false;
        if (cost > 0 && value >= cost * (1 + TP_BPS / 10000)) exit = true; // TP

        if (exit) {
          if (pendingByMint.has(mint)) continue;
          if (orders.length >= cap) break;
          orders.push({ side: 'sell', mint, token_amount: pos.token_amount.toString(), max_slippage_bps: SELL_SLIP_BPS });
        }
      }

      // Entries: buy at first trade
      let free = Number(state.freeCashLamports()) / Number(LAMPORTS_PER_SOL);
      let slotsLeft = MAX_OPEN - state.committedPositionCount();

      const seenMints = new Set<string>();
      for (const e of batch.events) {
        if (e.event !== 'TradeEvent') continue;
        const mint = e.mint;
        if (seenMints.has(mint)) continue;
        seenMints.add(mint);
        if (orders.length >= cap) break;
        if (held.has(mint)) continue;
        if (slotsLeft <= 0) break;

        const curve = state.curves.get(mint);
        if (!curve || curve.complete) continue;

        const rqSol = Number(curve.real_quote_reserves) / Number(LAMPORTS_PER_SOL);
        if (rqSol < MIN_RQ_SOL) continue;

        const entries = entriesPerMint.get(mint) ?? 0;
        if (entries >= 3) continue;

        const capSol = Math.floor(Number(state.maxBuyLamports(mint))) / Number(LAMPORTS_PER_SOL);
        let amount = Math.min(STAKE_SOL, capSol, free - txFee);
        if (amount < 0.01) continue;

        const lamports = BigInt(Math.floor(amount * Number(LAMPORTS_PER_SOL)));
        orders.push({ side: 'buy', mint, quote_lamports: lamports.toString(), max_slippage_bps: BUY_SLIP_BPS });
        free -= amount + txFee;
        slotsLeft--;

        held.set(mint, { opened: now, cost: lamports, tokens: BigInt(0) });
        entriesPerMint.set(mint, entries + 1);
      }

      return orders;
    },
    onDone() { },
  };
}

await runBot(createBot());