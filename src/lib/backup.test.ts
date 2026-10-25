// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildCsv } from "./backup";

describe("buildCsv", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("retourne uniquement l'en-tête sans donnée", () => {
    const csv = buildCsv();

    expect(csv.startsWith("\uFEFF")).toBe(true); // BOM pour Excel
    expect(csv.slice(1).split("\n")[0]).toBe(
      "date;cigarettes;objectif;dans_objectif;derniere_cigarette",
    );
    expect(csv.trimEnd().split("\n")).toHaveLength(1);
  });

  it("liste les jours suivis triés et calcule le dépassement", () => {
    window.localStorage.setItem(
      "smokertrack.v1",
      JSON.stringify({
        goal: 7,
        days: {
          "2026-10-24": { count: 4, lastSmokedAt: "2026-10-24T08:12:00.000Z" },
          "2026-10-22": { count: 9, lastSmokedAt: null },
          "2026-10-23": { count: 7, lastSmokedAt: "2026-10-23T18:40:00.000Z" },
        },
      }),
    );

    const lines = buildCsv().slice(1).trimEnd().split("\n");

    expect(lines).toHaveLength(4);
    // Tri chronologique.
    expect(lines[1]).toBe("2026-10-22;9;7;non;");
    expect(lines[2]).toBe("2026-10-23;7;7;oui;2026-10-23T18:40:00.000Z");
    expect(lines[3]).toBe("2026-10-24;4;7;oui;2026-10-24T08:12:00.000Z");
  });

  it("borne les valeurs aberrantes comme le reste de l'application", () => {
    window.localStorage.setItem(
      "smokertrack.v1",
      JSON.stringify({ goal: 999, days: { "2026-10-24": { count: -5, lastSmokedAt: 42 } } }),
    );

    const lines = buildCsv().slice(1).trimEnd().split("\n");

    expect(lines[1]).toBe("2026-10-24;0;100;oui;");
  });
});
