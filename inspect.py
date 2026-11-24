#!/usr/bin/env python3
# inspect.py — parse a grade-local run dir and print a summary.
# Usage: python3 inspect.py <grade-out-dir>
import json
import sys
from pathlib import Path

if len(sys.argv) != 2:
    print("usage: python3 inspect.py <grade-out-dir>", file=sys.stderr)
    sys.exit(2)

d = Path(sys.argv[1])
s = json.loads((d / "summary.json").read_text())

net = s.get("netPnl") or s.get("net_without_top_lamports") or 0
fills = s.get("fills") or s.get("totalFills") or 0
mints = s.get("distinctMints") or s.get("mints") or 0
dd = s.get("maxDrawdown") or s.get("dd") or 0
win_rate = s.get("winRate", 0)
wins = s.get("wins") or int(fills * win_rate)

print(f"netPnlSol: {net / 1e9:.6f}")
print(f"fills: {fills}")
print(f"distinctMints: {mints}")
print(f"maxDrawdown: {dd:.6f}")
print(f"wins: {wins}")