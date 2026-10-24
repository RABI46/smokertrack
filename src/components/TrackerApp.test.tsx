// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackerApp from "./TrackerApp";
import { dayKey } from "@/lib/date";

/** `next/link` est remplacé par une ancre simple dans l'environnement de test. */
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("TrackerApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    vi.restoreAllMocks();
  });

  it("affiche un compteur à zéro et l'objectif par défaut", async () => {
    render(<TrackerApp />);

    // Le rendu réel n'arrive qu'après le montage (pas de décalage d'hydratation).
    expect(await screen.findByText("Sur cet appareil")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy();
    expect(screen.getByText("objectif 10")).toBeTruthy();
  });

  it("incrémente le compteur à chaque clic", async () => {
    render(<TrackerApp />);

    const addButton = await screen.findByRole("button", {
      name: "Ajouter une cigarette à aujourd'hui",
    });

    fireEvent.click(addButton);
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("Encore 8 cigarettes dans l'objectif.")).toBeTruthy();
    });
  });

  it("annule la dernière cigarette enregistrée", async () => {
    render(<TrackerApp />);

    const addButton = await screen.findByRole("button", {
      name: "Ajouter une cigarette à aujourd'hui",
    });
    fireEvent.click(addButton);
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Annuler la dernière cigarette enregistrée" }));
    await waitFor(() =>
      expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy(),
    );
  });

  it("ne descend pas sous zéro et désactive l'annulation", async () => {
    render(<TrackerApp />);
    const undoButton = (await screen.findByRole("button", {
      name: "Annuler la dernière cigarette enregistrée",
    })) as HTMLButtonElement;

    expect(undoButton.disabled).toBe(true);
    fireEvent.click(undoButton);
    expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy();
  });

  it("modifie l'objectif quotidien", async () => {
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    fireEvent.click(screen.getByRole("button", { name: "Augmenter l'objectif d'une cigarette" }));

    await waitFor(() => expect(screen.getByText("objectif 11")).toBeTruthy());
  });

  it("conserve les données après un remontage (persistance)", async () => {
    const { unmount } = render(<TrackerApp />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ajouter une cigarette à aujourd'hui" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );

    unmount();
    render(<TrackerApp />);
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );
  });

  it("efface les données après confirmation", async () => {
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);
    render(<TrackerApp />);

    const addButton = await screen.findByRole("button", {
      name: "Ajouter une cigarette à aujourd'hui",
    });
    fireEvent.click(addButton);
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Effacer toutes mes données" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy(),
    );
  });

  it("affiche l'heure de la dernière cigarette et le compte à rebours", async () => {
    const lastSmokedAt = new Date(Date.now() - 30 * 60_000);
    window.localStorage.setItem(
      "smokertrack.v1",
      JSON.stringify({
        goal: 10,
        days: { [dayKey()]: { count: 2, lastSmokedAt: lastSmokedAt.toISOString() } },
      }),
    );

    render(<TrackerApp />);

    // Objectif 10 → 96 min entre deux cigarettes, 30 min déjà écoulées.
    // La seconde en cours est tronquée : 1 h 05 ou 1 h 06 selon l'instant du rendu.
    await waitFor(() => expect(screen.getByText(/^dans 1 h 0[56] min$/)).toBeTruthy());
    expect(screen.getByText("Prochaine cigarette")).toBeTruthy();
    expect(screen.getByText(/^Dernière : /)).toBeTruthy();
  });

  it("affiche le retard quand le créneau est dépassé", async () => {
    const lastSmokedAt = new Date(Date.now() - 200 * 60_000);
    window.localStorage.setItem(
      "smokertrack.v1",
      JSON.stringify({
        goal: 10,
        days: { [dayKey()]: { count: 2, lastSmokedAt: lastSmokedAt.toISOString() } },
      }),
    );

    render(<TrackerApp />);

    await waitFor(() =>
      expect(screen.getByText(/^en retard de 1 h 4[34] min$/)).toBeTruthy(),
    );
  });

  it("n'affiche pas de compte à rebours sans cigarette du jour", async () => {
    render(<TrackerApp />);

    await waitFor(() => expect(screen.getByText("Prochaine cigarette")).toBeTruthy());
    expect(
      screen.getByText("le compte à rebours démarre à la première cigarette du jour"),
    ).toBeTruthy();
  });

  it("restaure une sauvegarde importée", async () => {
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    const backup = {
      format: "smokertrack-backup",
      version: 1,
      exportedAt: "2026-05-10T18:00:00.000Z",
      goal: 7,
      days: { [dayKey()]: { count: 3, lastSmokedAt: null } },
    };
    const file = new File([JSON.stringify(backup)], "sauvegarde.json", {
      type: "application/json",
    });

    const input = screen.getByLabelText(
      "Choisir un fichier de sauvegarde SmokeTracker",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("objectif 7")).toBeTruthy());
  });
});
