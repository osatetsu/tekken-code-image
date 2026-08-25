import { describe, expect, it } from "vitest";
import { renderSvg } from "../src/core/svg/render";

describe("SVG rendering", () => {
  it("replaces the container contents with a parsed SVG element", () => {
    const container = document.createElement("div");
    container.append(document.createElement("span"));

    renderSvg(
      container,
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Test</text></svg>',
    );

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.localName).toBe("svg");
    expect(container.querySelector("text")?.textContent).toBe("Test");
  });

  it("rejects malformed SVG markup", () => {
    const container = document.createElement("div");

    expect(() => renderSvg(container, "<svg>")).toThrow("Unable to render SVG");
  });
});
