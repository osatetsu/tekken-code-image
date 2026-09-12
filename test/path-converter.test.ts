import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * `svg-text-to-path` をモック差し替えして API 呼出経路のみ検証する。
 * 実フォントを同梱しない方針のため、`Session` クラスの挙動はモックで再現する。
 */
describe("convertTextNodesToPaths", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the original SVG when there is no <text> node", async () => {
    const { convertTextNodesToPaths } = await import("@core/svg/path-converter");
    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><g><circle r="4"/></g></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });
    expect(result.svg).toBe(input);
    expect(result.replaced).toBe(0);
    expect(result.failed).toBe(false);
  });

  it("invokes the Session API when <text> is present", async () => {
    const mockReplaceAll = vi.fn().mockResolvedValue({
      replaced: 1,
      missed: new Map(),
      warnings: new Map(),
      errors: new Map(),
    });
    const mockGetSvgString = vi.fn().mockReturnValue(
      '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>',
    );
    const mockDestroy = vi.fn();

    vi.doMock("svg-text-to-path/entries/browser-opentypejs.js", () => ({
      default: class MockSession {
        replaceAll = mockReplaceAll;
        getSvgString = mockGetSvgString;
        destroy = mockDestroy;
      },
    }));

    const { convertTextNodesToPaths } = await import("@core/svg/path-converter");

    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(mockReplaceAll).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
    expect(result.svg).toContain("<path");
    expect(result.replaced).toBe(1);
    expect(result.failed).toBe(false);

    vi.doUnmock("svg-text-to-path/entries/browser-opentypejs.js");
  });

  it("returns original SVG when Session.replaceAll throws", async () => {
    const mockReplaceAll = vi.fn().mockRejectedValue(new Error("font parse failed"));
    const mockDestroy = vi.fn();

    vi.doMock("svg-text-to-path/entries/browser-opentypejs.js", () => ({
      default: class MockSession {
        replaceAll = mockReplaceAll;
        getSvgString = vi.fn().mockReturnValue("");
        destroy = mockDestroy;
      },
    }));

    const { convertTextNodesToPaths } = await import("@core/svg/path-converter");

    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(result.svg).toBe(input);
    expect(result.failed).toBe(true);

    vi.doUnmock("svg-text-to-path/entries/browser-opentypejs.js");
  });

  it("marks failed=true when Session.replaceAll returns replaced=0", async () => {
    const mockReplaceAll = vi.fn().mockResolvedValue({
      replaced: 0,
      missed: new Map(),
      warnings: new Map(),
      errors: new Map(),
    });
    const mockGetSvgString = vi.fn().mockReturnValue(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>',
    );
    const mockDestroy = vi.fn();

    vi.doMock("svg-text-to-path/entries/browser-opentypejs.js", () => ({
      default: class MockSession {
        replaceAll = mockReplaceAll;
        getSvgString = mockGetSvgString;
        destroy = mockDestroy;
      },
    }));

    const { convertTextNodesToPaths } = await import("@core/svg/path-converter");

    const input =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(result.replaced).toBe(0);
    expect(result.failed).toBe(true);

    vi.doUnmock("svg-text-to-path/entries/browser-opentypejs.js");
  });
});
