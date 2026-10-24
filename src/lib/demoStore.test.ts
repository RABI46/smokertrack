import { describe, expect, it } from "vitest";
import { applyIncrement } from "./demoStore";

const emptyState = { goal: 10, days: {} };
const now = new Date("2026-05-10T18:00:00.000Z");

describe("applyIncrement", () => {
  it("crée la journée à 1 lors du premier ajout", () => {
    const next = applyIncrement(emptyState, "2026-05-10", 1, now);
    expect(next.days["2026-05-10"]).toEqual({ count: 1, lastSmokedAt: now.toISOString() });
  });

  it("incrémente une journée existante", () => {
    const first = applyIncrement(emptyState, "2026-05-10", 1, now);
    const second = applyIncrement(first, "2026-05-10", 1, now);
    expect(second.days["2026-05-10"]?.count).toBe(2);
  });

  it("décrémente sans descendre sous zéro", () => {
    const first = applyIncrement(emptyState, "2026-05-10", 1, now);
    const second = applyIncrement(first, "2026-05-10", -1, now);
    expect(second.days["2026-05-10"]?.count).toBe(0);

    const third = applyIncrement(second, "2026-05-10", -1, now);
    expect(third.days["2026-05-10"]?.count).toBe(0);
  });

  it("ne touche pas à l'horodatage lors d'une annulation", () => {
    const first = applyIncrement(emptyState, "2026-05-10", 1, now);
    const second = applyIncrement(first, "2026-05-10", -1, new Date("2026-05-11T08:00:00.000Z"));
    expect(second.days["2026-05-10"]?.lastSmokedAt).toBe(now.toISOString());
  });

  it("ne mute pas l'état d'origine", () => {
    applyIncrement(emptyState, "2026-05-10", 1, now);
    expect(emptyState.days).toEqual({});
  });

  it("ignore les clés de jour distinctes", () => {
    const first = applyIncrement(emptyState, "2026-05-10", 1, now);
    const second = applyIncrement(first, "2026-05-11", 1, now);
    expect(second.days["2026-05-10"]?.count).toBe(1);
    expect(second.days["2026-05-11"]?.count).toBe(1);
  });
});
