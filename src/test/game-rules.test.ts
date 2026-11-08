import { describe, expect, it } from "vitest";

import {
  canStartWave,
  defenderSellRefund,
  MINE_SELL_REFUND,
  SAPPER_CHARGE_SECONDS,
} from "@/game/rules";

describe("BSOD_defense rules", () => {
  it.each([
    [125, 62],
    [150, 75],
    [175, 87],
    [100, 50],
    [50, 25],
  ])("sells a defender costing %i MB for %i MB", (cost, refund) => {
    expect(defenderSellRefund(cost)).toBe(refund);
  });

  it("returns exactly 10 MB for a sold mine", () => {
    expect(MINE_SELL_REFUND).toBe(10);
  });

  it("charges the Sapper for exactly 15 seconds", () => {
    expect(SAPPER_CHARGE_SECONDS).toBe(15);
  });

  it("allows a wave only when no queued or active enemies remain", () => {
    expect(canStartWave(0, 0)).toBe(true);
    expect(canStartWave(1, 0)).toBe(false);
    expect(canStartWave(0, 1)).toBe(false);
  });
});
