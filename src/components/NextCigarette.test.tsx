// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import NextCigarette from "./NextCigarette";
import { dayKey } from "@/lib/date";
import styles from "./tracker.module.css";

/**
 * Le compte à rebours a trois états visuels :
 * - **rouge** (`nextValue`) pendant tout le décompte ;
 * - **vert** (`nextOverdue` + `nextRowDue`) dès qu'il atteint zéro ;
 * - neutre (`nextRowIdle`) sans cigarette du jour.
 */
describe("NextCigarette", () => {
  afterEach(() => cleanup());

  it("reste rouge pendant le décompte", () => {
    const lastSmokedToday = new Date(Date.now() - 10 * 60_000);
    render(
      <NextCigarette
        lastSmokedToday={lastSmokedToday}
        goal={10}
        todayKey={dayKey()}
        timeZone="Europe/Paris"
      />,
    );

    const countdown = screen.getByText(/^dans /);
    expect(countdown.className).toContain(styles.nextValue);
    expect(countdown.className).not.toContain(styles.nextOverdue);
    expect(countdown.closest("p")?.className).not.toContain(styles.nextRowDue);
    expect(screen.getByText(/^repère : /)).toBeTruthy();
  });

  it("bascule en vert quand le compte arrive à zéro", () => {
    // Objectif 10 → 96 min d'écart : 200 min écoulées = créneau dépassé.
    const lastSmokedToday = new Date(Date.now() - 200 * 60_000);
    render(
      <NextCigarette
        lastSmokedToday={lastSmokedToday}
        goal={10}
        todayKey={dayKey()}
        timeZone="Europe/Paris"
      />,
    );

    const countdown = screen.getByText(/^en retard de /);
    expect(countdown.className).toContain(styles.nextOverdue);
    expect(countdown.className).not.toContain(styles.nextValue);
    // La rangée porte aussi l'attribut d'état (pastille verte du libellé).
    expect(countdown.closest("p")?.className).toContain(styles.nextRowDue);
  });

  it("reste neutre sans cigarette du jour", () => {
    render(
      <NextCigarette
        lastSmokedToday={null}
        goal={10}
        todayKey={dayKey()}
        timeZone="Europe/Paris"
      />,
    );

    expect(
      screen.getByText("le compte à rebours démarre à la première cigarette du jour"),
    ).toBeTruthy();
    const row = screen.getByText("Prochaine cigarette").closest("p");
    expect(row?.className).toContain(styles.nextRowIdle);
    expect(row?.className).not.toContain(styles.nextRowDue);
  });

  it("reste neutre si la dernière cigarette date d'un autre jour", () => {
    // 30 h en arrière : toujours la veille ou avant, quelle que soit l'heure.
    const earlierDay = new Date(Date.now() - 30 * 60 * 60_000);
    render(
      <NextCigarette
        lastSmokedToday={earlierDay}
        goal={10}
        todayKey={dayKey()}
        timeZone="Europe/Paris"
      />,
    );

    expect(
      screen.getByText("le compte à rebours démarre à la première cigarette du jour"),
    ).toBeTruthy();
  });
});
