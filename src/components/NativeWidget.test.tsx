// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrackerApp from "./TrackerApp";
import { dayKey } from "@/lib/date";
import { consumeWidgetAdditions, isNativeApp, syncWidgetState } from "@/lib/widgetBridge";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

interface FakeBridge {
  sync: ReturnType<typeof vi.fn>;
  consumePending: ReturnType<typeof vi.fn>;
}

/** Simule le pont Capacitor injecté dans l'APK Android. */
function installNativeBridge(pending = 0): FakeBridge {
  const bridge: FakeBridge = {
    sync: vi.fn(async () => undefined),
    consumePending: vi.fn(async () => ({ pending })),
  };
  (window as unknown as { Capacitor: unknown }).Capacitor = {
    isNativePlatform: () => true,
    Plugins: { WidgetBridge: bridge },
  };
  return bridge;
}

function removeNativeBridge() {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
}

describe("widgetBridge", () => {
  afterEach(() => {
    removeNativeBridge();
  });

  it("est inactif dans un navigateur", async () => {
    expect(isNativeApp()).toBe(false);
    await expect(consumeWidgetAdditions()).resolves.toBe(0);
    await expect(
      syncWidgetState({ todayKey: "2026-10-24", count: 3, goal: 10 }),
    ).resolves.toBeUndefined();
  });

  it("pousse un résumé normalisé vers le widget", async () => {
    const bridge = installNativeBridge();

    await syncWidgetState({ todayKey: "2026-10-24", count: 4.6, goal: 0 });

    expect(bridge.sync).toHaveBeenCalledWith({
      todayKey: "2026-10-24",
      count: 5,
      goal: 1,
    });
  });

  it("lit et normalise la file d'attente du widget", async () => {
    installNativeBridge(3);
    await expect(consumeWidgetAdditions()).resolves.toBe(3);
  });

  it("ignore une valeur aberrante renvoyée par le natif", async () => {
    const bridge = installNativeBridge();
    bridge.consumePending.mockResolvedValueOnce({ pending: Number.NaN } as never);
    await expect(consumeWidgetAdditions()).resolves.toBe(0);
  });

  it("ne casse pas si le plugin lève une erreur", async () => {
    const bridge = installNativeBridge();
    bridge.sync.mockRejectedValueOnce(new Error("boom"));
    bridge.consumePending.mockRejectedValueOnce(new Error("boom"));

    await expect(
      syncWidgetState({ todayKey: "2026-10-24", count: 1, goal: 10 }),
    ).resolves.toBeUndefined();
    await expect(consumeWidgetAdditions()).resolves.toBe(0);
  });
});

describe("application native", () => {
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
    removeNativeBridge();
  });

  it("fusionne les cigarettes ajoutées depuis le widget au démarrage", async () => {
    installNativeBridge(3);
    render(<TrackerApp />);

    await waitFor(() =>
      expect(screen.getByText("Encore 7 cigarettes dans l'objectif.")).toBeTruthy(),
    );
  });

  it("synchronise le widget après chaque saisie", async () => {
    const bridge = installNativeBridge(0);
    render(<TrackerApp />);

    const addButton = await screen.findByRole("button", {
      name: "Ajouter une cigarette à aujourd'hui",
    });
    fireEvent.click(addButton);

    await waitFor(() =>
      expect(bridge.sync).toHaveBeenCalledWith(
        expect.objectContaining({ todayKey: dayKey(), count: 1 }),
      ),
    );
  });

  it("n'applique la file d'attente qu'une seule fois", async () => {
    const bridge = installNativeBridge(2);
    render(<TrackerApp />);

    await waitFor(() =>
      expect(screen.getByText("Encore 8 cigarettes dans l'objectif.")).toBeTruthy(),
    );
    // Une seule consommation : pas de double comptage au re-rendu.
    expect(bridge.consumePending).toHaveBeenCalledTimes(1);
  });

  it("affiche le mode d'emploi du widget natif", async () => {
    installNativeBridge(0);
    render(<TrackerApp />);

    await screen.findByText("Widget d'écran d'accueil");
    expect(screen.getByText(/widget natif/i)).toBeTruthy();
    expect(screen.getByText(/Glisser le widget sur l'écran d'accueil/i)).toBeTruthy();
  });
});
