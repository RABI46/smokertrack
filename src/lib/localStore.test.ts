import { describe, expect, it } from "vitest";
import {
  AUTO_BACKUP_DAYS,
  BACKUP_REMINDER_DAYS,
  applyIncrement,
  parseBackup,
  shouldAutoBackup,
  shouldRemindBackup,
  toBackup,
  type PersistedState,
} from "./localStore";

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

describe("applyIncrement sur un jour passé", () => {
  it("ne modifie pas l'heure de la dernière cigarette", () => {
    const state: PersistedState = { goal: 10, days: {} };
    const next = applyIncrement(state, "2026-05-01", 1, now, false);
    expect(next.days["2026-05-01"]).toEqual({ count: 1, lastSmokedAt: null });
  });

  it("conserve l'heure déjà enregistrée", () => {
    const state: PersistedState = {
      goal: 10,
      days: { "2026-05-01": { count: 2, lastSmokedAt: "2026-05-01T20:00:00.000Z" } },
    };
    const next = applyIncrement(state, "2026-05-01", 1, now, false);
    expect(next.days["2026-05-01"]?.count).toBe(3);
    expect(next.days["2026-05-01"]?.lastSmokedAt).toBe("2026-05-01T20:00:00.000Z");
  });

  it("met bien à jour l'heure pour aujourd'hui (comportement par défaut)", () => {
    const state: PersistedState = { goal: 10, days: {} };
    const next = applyIncrement(state, "2026-05-10", 1, now);
    expect(next.days["2026-05-10"]?.lastSmokedAt).toBe(now.toISOString());
  });
});

describe("shouldRemindBackup", () => {
  const withData: PersistedState = {
    goal: 10,
    days: { "2026-05-10": { count: 3, lastSmokedAt: null } },
  };

  it("ne rappelle rien sans données", () => {
    expect(shouldRemindBackup({ goal: 10, days: {} }, { lastExportAt: null, autoBackup: true }, now)).toBe(false);
  });

  it("rappelle quand aucun export n'a jamais eu lieu", () => {
    expect(shouldRemindBackup(withData, { lastExportAt: null, autoBackup: true }, now)).toBe(true);
  });

  it("ne rappelle pas juste après un export", () => {
    expect(
      shouldRemindBackup(withData, { lastExportAt: now.toISOString(), autoBackup: true }, now),
    ).toBe(false);
  });

  it("rappelle après le délai configuré", () => {
    const old = new Date(now.getTime() - (BACKUP_REMINDER_DAYS + 1) * 86_400_000);
    expect(shouldRemindBackup(withData, { lastExportAt: old.toISOString(), autoBackup: true }, now)).toBe(true);
  });

  it("rappelle si la date d'export est corrompue", () => {
    expect(shouldRemindBackup(withData, { lastExportAt: "pas-une-date", autoBackup: true }, now)).toBe(true);
  });
});

describe("shouldAutoBackup", () => {
  const withData: PersistedState = {
    goal: 10,
    days: { "2026-05-10": { count: 3, lastSmokedAt: null } },
  };
  const meta = (overrides: Partial<Parameters<typeof shouldAutoBackup>[1]> = {}) => ({
    lastExportAt: null,
    autoBackup: true,
    ...overrides,
  });

  it("ne sauvegarde rien sans données", () => {
    expect(shouldAutoBackup({ goal: 10, days: {} }, meta(), now)).toBe(false);
  });

  it("respecte la désactivation du réglage", () => {
    expect(shouldAutoBackup(withData, meta({ autoBackup: false }), now)).toBe(false);
  });

  it("déclenche un export quand aucun n'a eu lieu", () => {
    expect(shouldAutoBackup(withData, meta(), now)).toBe(true);
  });

  it("ne déclenche rien juste après un export manuel", () => {
    expect(shouldAutoBackup(withData, meta({ lastExportAt: now.toISOString() }), now)).toBe(false);
  });

  it("ne déclenche rien juste après un export automatique", () => {
    expect(
      shouldAutoBackup(withData, meta({ lastAutoExportAt: now.toISOString() }), now),
    ).toBe(false);
  });

  it("déclenche après la période configurée", () => {
    const old = new Date(now.getTime() - (AUTO_BACKUP_DAYS + 1) * 86_400_000);
    expect(shouldAutoBackup(withData, meta({ lastExportAt: old.toISOString() }), now)).toBe(true);
  });

  it("utilise la date d'export la plus récente", () => {
    const recent = new Date(now.getTime() - 86_400_000).toISOString();
    const old = new Date(now.getTime() - 30 * 86_400_000).toISOString();
    expect(
      shouldAutoBackup(withData, meta({ lastExportAt: old, lastAutoExportAt: recent }), now),
    ).toBe(false);
  });
});
