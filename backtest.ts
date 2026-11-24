// backtest.ts — dev-window backtest of main.ts via the kit's grade-local CLI.
//
//   node backtest.ts <kit dir>
//
// Runs the repo bot against the frozen dev dataset using `makefun.mjs grade-local`,
// then prints net PnL (SOL), fills, distinct mints, max drawdown, and wins.
import { execFileSync } from 'child_process';
import fs from 'node:fs';

const KIT = process.argv[2] ?? process.env.MAKEFUN_KIT;
if (!KIT) {
  console.error('usage: node backtest.ts <kit dir>');
  process.exit(2);
}

const REPO = fs.realpathSync(new URL('.', import.meta.url).pathname);
const OUT = '/tmp/makefun-grade-out';

const cli = `${KIT}/cli/makefun.mjs`;
const botDir = `${REPO}/bot`;

// Sync main.ts into the bot dir the harness runs.
fs.copyFileSync(`${REPO}/main.ts`, `${botDir}/main.ts`);

execFileSync('node', [cli, 'grade-local', '--kit', KIT, '--bot', botDir, '--driver', 'process', '--json', '--save', OUT], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

const summary = JSON.parse(fs.readFileSync(`${OUT}/summary.json`, 'utf8'));

const netPnlSol = Number(summary.netPnl ?? summary.net_without_top_lamports ?? 0) / 1e9;
const fills = summary.fills ?? summary.totalFills ?? 0;
const mints = summary.distinctMints ?? summary.mints ?? 0;
const maxDD = Number(summary.maxDrawdown ?? summary.dd ?? 0);
const wins = summary.wins ?? summary.winningMints ?? Math.round(fills * Number(summary.winRate ?? 0));

console.log(`netPnlSol: ${netPnlSol.toFixed(6)}`);
console.log(`fills: ${fills}`);
console.log(`distinctMints: ${mints}`);
console.log(`maxDrawdown: ${maxDD.toFixed(6)}`);
console.log(`wins: ${wins}`);

export {};
