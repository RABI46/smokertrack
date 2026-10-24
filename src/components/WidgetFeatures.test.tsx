// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackerApp from "./TrackerApp";
import manifest from "@/app/manifest";
import { dayKey, formatLongDate, shiftDayKey } from "@/lib/date";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const today = () => dayKey();
const yesterday = () => shiftDayKey(today(), -1);

describe("manifeste PWA (raccourcis d'écran d'accueil)", () => {
  const shortcuts = manifest().shortcuts ?? [];

  it("expose un raccourci d'ajout rapide", () => {
    const add = shortcuts.find((shortcut) => shortcut.url === "./?action=add");
    expect(add).toBeDefined();
    expect(add?.short_name).toBe("Ajouter");
  });

  it("expose un raccourci vers le suivi", () => {
    expect(shortcuts.some((shortcut) => shortcut.url === "./")).toBe(true);
  });

  it("déclare les icônes et le périmètre nécessaires à l'installation", () => {
    const result = manifest();
    expect(result.icons?.length).toBeGreaterThanOrEqual(3);
    expect(result.scope).toBe("./");
    expect(result.start_url).toBe("./");
    expect(result.display).toBe("standalone");
  });
});

describe("ajout rapide via ?action=add", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/?action=add");
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
    window.history.replaceState(null, "", "/");
  });

  it("enregistre une cigarette au chargement et nettoie l'URL", async () => {
    render(<TrackerApp />);

    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );
    expect(screen.getByText("Cigarette ajoutée depuis le raccourci.")).toBeTruthy();
    expect(window.location.search).toBe("");
  });

  it("ne recompte pas si l'URL est rechargée", async () => {
    const { unmount } = render(<TrackerApp />);
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );
    unmount();

    // L'URL a été nettoyée : un nouveau montage ne doit rien ajouter.
    render(<TrackerApp />);
    await waitFor(() =>
      expect(screen.getByText("Encore 9 cigarettes dans l'objectif.")).toBeTruthy(),
    );
  });

  it("n'ajoute rien sans paramètre", async () => {
    window.history.replaceState(null, "", "/");
    render(<TrackerApp />);
    await waitFor(() =>
      expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy(),
    );
    expect(screen.queryByText("Cigarette ajoutée depuis le raccourci.")).toBeNull();
  });
});

describe("aide widget", () => {
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

  it("explique les limites et les solutions Android/iOS", async () => {
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    expect(screen.getByText("Widget & accès rapide")).toBeTruthy();
    expect(screen.getByText("Android — raccourci en appui long")).toBeTruthy();
    expect(screen.getByText("iPhone / iPad — widget Raccourcis")).toBeTruthy();
    expect(screen.getByText(/ne peut pas créer un vrai widget natif/i)).toBeTruthy();
  });
});

describe("correction d'un jour passé", () => {
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

  it("permet d'ajouter puis de retirer une cigarette à hier", async () => {
    render(<TrackerApp />);
    await screen.findByText("Sur cet appareil");

    const label = formatLongDate(yesterday());
    const addYesterday = screen.getByRole("button", {
      name: `Ajouter une cigarette au ${label}`,
    });
    fireEvent.click(addYesterday);

    const removeYesterday = await screen.findByRole("button", {
      name: `Retirer une cigarette du ${label}`,
    });
    await waitFor(() => expect((removeYesterday as HTMLButtonElement).disabled).toBe(false));

    // Le compteur du jour ne doit pas bouger.
    expect(screen.getByText("Journée vierge : le meilleur départ possible.")).toBeTruthy();

    fireEvent.click(removeYesterday);
    await waitFor(() => expect((removeYesterday as HTMLButtonElement).disabled).toBe(true));
  });
});
