// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackerApp from "./TrackerApp";
import { dayKey, shiftDayKey } from "@/lib/date";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

/** Données de test : X cigarettes par jour pour les N derniers jours. */
function seed(days: number, count: number) {
  const state = { goal: 10, days: {} as Record<string, { count: number; lastSmokedAt: null }> };
  for (let index = 0; index < days; index += 1) {
    state.days[shiftDayKey(dayKey(), -index)] = { count, lastSmokedAt: null };
  }
  window.localStorage.setItem("smokertrack.v1", JSON.stringify(state));
}

function seedMeta(meta: { lastExportAt?: string | null; autoBackup?: boolean }) {
  window.localStorage.setItem("smokertrack.meta.v1", JSON.stringify(meta));
}

describe("fiabilité des statistiques", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("n'affiche pas 30 jours parfaits sur une installation neuve", async () => {
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    // Le défaut historique : « 30 / 30 » et une série de 30 jours sans donnée.
    expect(screen.getByText("/ 0")).toBeTruthy();
    expect(screen.getByText("aucun jour suivi pour l'instant")).toBeTruthy();
    expect(screen.getByText("commencez votre suivi")).toBeTruthy();
    expect(screen.queryByText("/ 30")).toBeNull();
  });

  it("compte les jours suivis dès la première saisie", async () => {
    render(<TrackerApp />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une cigarette à aujourd'hui" }),
    );

    await waitFor(() => expect(screen.getByText("/ 1")).toBeTruthy());
    expect(screen.getByText("sur 1 jour suivi")).toBeTruthy();
  });

  it("affiche « hors suivi » pour les jours antérieurs au suivi", async () => {
    seed(3, 5);
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    await waitFor(() => expect(screen.getByText("sur 3 jours suivis")).toBeTruthy());
    // L'historique affiche 10 jours, dont 3 suivis → 7 « hors suivi ».
    expect(screen.getAllByText("hors suivi").length).toBe(7);
  });
});

describe("objectif réglable", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("accepte une valeur saisie directement", async () => {
    render(<TrackerApp />);
    const input = (await screen.findByLabelText(
      "Objectif quotidien (cigarettes par jour)",
    )) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "25" } });

    await waitFor(() => expect(screen.getByText("objectif 25")).toBeTruthy());
  });

  it("accepte le curseur", async () => {
    render(<TrackerApp />);
    const slider = (await screen.findByLabelText("Régler l'objectif quotidien")) as HTMLInputElement;

    fireEvent.change(slider, { target: { value: "6" } });

    await waitFor(() => expect(screen.getByText("objectif 6")).toBeTruthy());
  });

  it("borne les valeurs hors limites", async () => {
    render(<TrackerApp />);
    const input = (await screen.findByLabelText(
      "Objectif quotidien (cigarettes par jour)",
    )) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "500" } });

    await waitFor(() => expect(screen.getByText("objectif 100")).toBeTruthy());
  });
});

describe("sauvegarde automatique", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    // jsdom n'implémente ni les Blob URL ni la navigation déclenchée par un
    // lien <a download> : on neutralise les deux pour garder des logs lisibles.
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:smokertrack"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exporte automatiquement quand aucun export n'a eu lieu", async () => {
    seed(3, 4);
    render(<TrackerApp />);

    await waitFor(() =>
      expect(screen.getByText("Sauvegarde automatique effectuée.")).toBeTruthy(),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("enregistre la date du dernier export automatique", async () => {
    seed(3, 4);
    render(<TrackerApp />);

    await waitFor(() => expect(screen.getByText("Sauvegarde automatique effectuée.")).toBeTruthy());
    const meta = JSON.parse(window.localStorage.getItem("smokertrack.meta.v1") ?? "{}");
    expect(typeof meta.lastAutoExportAt).toBe("string");
  });

  it("ne réexporte pas si un export récent existe", async () => {
    seed(3, 4);
    seedMeta({ lastExportAt: new Date().toISOString(), autoBackup: true });
    render(<TrackerApp />);

    await screen.findByText("Sur cet appareil");
    expect(screen.queryByText("Sauvegarde automatique effectuée.")).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("respecte la désactivation du réglage", async () => {
    seed(3, 4);
    seedMeta({ lastExportAt: null, autoBackup: false });
    render(<TrackerApp />);

    await screen.findByText("Sur cet appareil");
    expect(screen.queryByText("Sauvegarde automatique effectuée.")).toBeNull();

    const toggle = screen.getByLabelText("Sauvegarde automatique hebdomadaire") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });

  it("enregistre la préférence au changement", async () => {
    seed(3, 4);
    seedMeta({ lastExportAt: new Date().toISOString(), autoBackup: true });
    render(<TrackerApp />);

    const toggle = (await screen.findByLabelText(
      "Sauvegarde automatique hebdomadaire",
    )) as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);

    await waitFor(() => {
      const meta = JSON.parse(window.localStorage.getItem("smokertrack.meta.v1") ?? "{}");
      expect(meta.autoBackup).toBe(false);
    });
  });
});
