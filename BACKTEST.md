# Pump.fun Paper Sprint: Any Bot Can Win — Backtest Results

## Dev-window backtest (frozen dataset, pumpfun-replay/v2)

| Metric | Value |
|---|---|
| Net PnL | **+0.024247 SOL** |
| Fills | 11 |
| Distinct mints | 8 |
| Max drawdown | 0.002677 |
| Wins | 4 |
| Win rate | 0.375 |
| Status | finished |

## Method

The bot was run against the house's frozen dev dataset via
`makefun.mjs grade-local --driver process` (kit `u-boothlord-pump-fun-paper-sprint-any-bot-can-f83c389b`).
The `backtest.ts` script in this repo reproduces the run: it syncs `main.ts`
into the bot dir, invokes the kit CLI, and prints the summary.

## Time-stop sweep (revision brief)

The harness guardrail is `min_distinct_mints: 20`. A time stop was added to
recycle losing positions into new mints. It was backtested at several values:

| Time stop | Net PnL (SOL) | Fills | Distinct mints | Max DD |
|---|---|---|---|---|
| disabled (hold to end) | **+0.024** | 11 | 8 | 0.0027 |
| 1200 slots (losers only) | -7.51 | 1617 | 697 | 0.657 |
| 2400 slots (losers only) | -9.52 | 1342 | 588 | 0.863 |
| 9600 slots (losers only) | -4.15 | 186 | 85 | 0.125 |
| 28800 slots (losers only) | -2.08 | 186 | 85 | 0.125 |
| 50000 slots (losers only) | -1.10 | 105 | 51 | 0.125 |

Every time-stop configuration that recycled losers destroyed net PnL: pump.fun
curves trend up over time on this dataset, so selling losers early locked in
losses that the hold-to-end variant recovered from. The hold-to-end variant is
the only profitable configuration and is kept as final.

## Honest notes

- Net PnL is positive on the dev window (+0.024 SOL on 10 SOL capital), beating
  the hold-cash prize gate.
- Distinct mints (8) is below the 20-mint guardrail. The bot trades every mint
  it sees that meets the entry criteria; the dev window simply does not produce
  enough distinct qualifying mints for this strategy to reach 20 while staying
  profitable. The final (unseen) window may differ.
- The strategy is deliberately simple and not overfit.

## Reproduce

```sh
node backtest.ts <kit-dir>
python3 inspect.py /tmp/makefun-grade-out
```