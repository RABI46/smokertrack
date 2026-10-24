import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDayLabel,
  formatLongDate,
  isValidDayKey,
  lastDayKeys,
  shiftDayKey,
} from "./date";

describe("dayKey", () => {
  it("respecte le fuseau demandé", () => {
    // 23:30 UTC le 1er janvier = déjà le 2 janvier à Paris.
    const instant = new Date("2026-01-01T23:30:00.000Z");
    expect(dayKey(instant, "UTC")).toBe("2026-01-01");
    expect(dayKey(instant, "Europe/Paris")).toBe("2026-01-02");
    expect(dayKey(instant, "America/New_York")).toBe("2026-01-01");
  });

  it("gère le passage à l'heure d'été sans décalage", () => {
    const instant = new Date("2026-03-29T00:30:00.000Z");
    expect(dayKey(instant, "Europe/Paris")).toBe("2026-03-29");
  });
});

describe("shiftDayKey", () => {
  it("décale dans le passé et le futur", () => {
    expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("franchit correctement une année bissextile", () => {
    expect(shiftDayKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("lastDayKeys", () => {
  it("retourne une fenêtre ordonnée et terminée par le jour courant", () => {
    const keys = lastDayKeys(7, "2026-05-10");
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2026-05-04");
    expect(keys[6]).toBe("2026-05-10");
  });

  it("gère une fenêtre nulle ou négative", () => {
    expect(lastDayKeys(0)).toEqual([]);
    expect(lastDayKeys(-3)).toEqual([]);
  });
});

describe("isValidDayKey", () => {
  it("accepte les clés valides et rejette les autres", () => {
    expect(isValidDayKey("2026-02-28")).toBe(true);
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("2026-2-3")).toBe(false);
    expect(isValidDayKey("aujourd'hui")).toBe(false);
  });
});

describe("formats lisibles", () => {
  it("produit un libellé court et long en français", () => {
    expect(formatDayLabel("2026-05-10")).toBe("dim.");
    expect(formatLongDate("2026-05-10")).toContain("mai");
  });
});
