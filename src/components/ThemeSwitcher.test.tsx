// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ThemeSwitcher, {
  THEME_STORAGE_KEY,
  applyTheme,
  readTheme,
} from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("démarré sur « Auto », le thème suit le système (aucun attribut)", () => {
    render(<ThemeSwitcher />);

    const auto = screen.getByRole("button", { name: "Auto" });
    expect(auto.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("force le thème sombre et le mémorise", () => {
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Sombre" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Sombre" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("force le thème clair et le mémorise", () => {
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Clair" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("revient au système avec « Auto »", () => {
    applyTheme("dark");
    render(<ThemeSwitcher />);

    fireEvent.click(screen.getByRole("button", { name: "Auto" }));

    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("restaure la préférence mémorisée au remontage", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(readTheme()).toBe("light");

    render(<ThemeSwitcher />);
    expect(screen.getByRole("button", { name: "Clair" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("ignore une préférence corrompue", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readTheme()).toBe("auto");
  });
});
