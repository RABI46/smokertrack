import { describe, expect, it } from "vitest";
import { applyIncrement, parseBackup, toBackup, type PersistedState } from "./localStore";

const emptyState: PersistedState = { goal: 10, days: {} };
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

  it("plafonne à 200 cigarettes par jour", () => {
    const state: PersistedState = {
      goal: 10,
      days: { "2026-05-10": { count: 200, lastSmokedAt: null } },
    };
    expect(applyIncrement(state, "2026-05-10", 1, now)).toBe(state);
  });
});

describe("toBackup", () => {
  it("produit un fichier de sauvegarde versionné", () => {
    const state: PersistedState = {
      goal: 12,
      days: { "2026-05-10": { count: 3, lastSmokedAt: now.toISOString() } },
    };
    const backup = toBackup(state, now);
    expect(backup).toMatchObject({
      format: "smokertrack-backup",
      version: 1,
      exportedAt: now.toISOString(),
      goal: 12,
    });
    expect(backup.days["2026-05-10"]?.count).toBe(3);
  });
});

describe("parseBackup", () => {
  it("accepte une sauvegarde valide et normalise les valeurs", () => {
    const parsed = parseBackup({
      format: "smokertrack-backup",
      version: 1,
      exportedAt: now.toISOString(),
      goal: 500,
      days: { "2026-05-10": { count: 4, lastSmokedAt: null } },
    });
    expect(parsed.goal).toBe(100); // borné
    expect(parsed.days["2026-05-10"]).toEqual({ count: 4, lastSmokedAt: null });
  });

  it("rejette un fichier étranger", () => {
    expect(() => parseBackup({ hello: "world" })).toThrow(/pas une sauvegarde/i);
  });

  it("rejette une version inconnue", () => {
    expect(() =>
      parseBackup({ format: "smokertrack-backup", version: 99, days: {} }),
    ).toThrow(/Version/i);
  });

  it("rejette une sauvegarde sans journées", () => {
    expect(() => parseBackup({ format: "smokertrack-backup", version: 1 })).toThrow(/incomplète/i);
  });

  it("rejette une entrée non-objet", () => {
    expect(() => parseBackup("texte")).toThrow(/illisible/i);
  });

  it("ignore les journées corrompues", () => {
    const parsed = parseBackup({
      format: "smokertrack-backup",
      version: 1,
      days: { "2026-05-10": null, "2026-05-11": { count: "3", lastSmokedAt: 42 } },
    });
    expect(parsed.days["2026-05-10"]).toBeUndefined();
    expect(parsed.days["2026-05-11"]).toEqual({ count: 3, lastSmokedAt: null });
  });
});
