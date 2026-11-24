# Entry

Node 22 TypeScript bot (`main.ts`) for the Pump.fun Paper Sprint.

## What it does

- Buys early pump.fun curves at the first trade event (min 0.001 SOL real reserves).
- 0.3 SOL stake per position, max 5 open positions, max 3 entries per mint.
- Sells at +35% take-profit (winners recycle into new mints).
- No stop loss; losers are held to end of window (pump.fun curves trend up over time).
- No shorts, no leverage, deterministic except `state.hello.seed`.

## Parameters (frozen)

STAKE_SOL = 0.3, MIN_RQ_SOL = 0.001, MIN_TRADES = 1, TP_BPS = 3500,
SL_BPS = 99999 (disabled), MAX_HOLD_SLOTS = 9999999 (disabled, hold to end).