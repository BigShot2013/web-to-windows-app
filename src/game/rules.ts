export const SAPPER_CHARGE_SECONDS = 15;
export const MINE_SELL_REFUND = 10;
export const MAX_MINES = 5;

export function defenderSellRefund(cost: number) {
  return Math.floor(cost / 2);
}

export function canStartWave(queuedEnemies: number, activeEnemies: number) {
  return queuedEnemies === 0 && activeEnemies === 0;
}
