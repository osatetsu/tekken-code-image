import { describe, expect, it } from "vitest";
import { createLatestRequestGate } from "../src/entries/web/latest-request-gate";

describe("createLatestRequestGate", () => {
  it("accepts only the latest request id", () => {
    const gate = createLatestRequestGate();

    const first = gate.next();
    const second = gate.next();

    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });
});
