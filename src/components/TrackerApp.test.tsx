// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackerApp from "./TrackerApp";

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
  });

  it("affiche le compteur du jour à zéro en mode démo", async () => {
    render(<TrackerApp />);

    // Le rendu réel n'arrive qu'après le montage (pas de décalage d'hydratation).
    expect(await screen.findByText("Mode démo local")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy();
    expect(screen.getByText("objectif 10")).toBeTruthy();
  });

  it("incrémente le compteur au clic", async () => {
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
    await screen.findByText("Mode démo local");

    fireEvent.click(screen.getByRole("button", { name: "Augmenter l'objectif d'une cigarette" }));

    await waitFor(() => expect(screen.getByText("objectif 11")).toBeTruthy());
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
});
