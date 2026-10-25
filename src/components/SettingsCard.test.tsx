// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SettingsCard from "./SettingsCard";

function renderCard(overrides: Partial<Parameters<typeof SettingsCard>[0]> = {}) {
  return render(
    <SettingsCard
      goal={10}
      pending={false}
      autoBackup
      onChangeGoal={vi.fn()}
      onToggleAutoBackup={vi.fn()}
      onEraseAll={vi.fn()}
      onExport={vi.fn()}
      onExportCsv={vi.fn()}
      onImport={vi.fn()}
      {...overrides}
    />,
  );
}

describe("SettingsCard — export CSV", () => {
  afterEach(() => cleanup());

  it("propose l'export CSV et délègue au tracker", () => {
    const onExportCsv = vi.fn();
    renderCard({ onExportCsv });

    fireEvent.click(screen.getByRole("button", { name: "Exporter en CSV" }));

    expect(onExportCsv).toHaveBeenCalledOnce();
  });

  it("reste utilisable pendant un enregistrement (désactivé)", () => {
    const onExportCsv = vi.fn();
    renderCard({ pending: true, onExportCsv });

    const button = screen.getByRole("button", { name: "Exporter en CSV" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.click(button);
    expect(onExportCsv).not.toHaveBeenCalled();
  });
});
