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

  it("returns original SVG when conversion is partial (missed/errors)", async () => {
    const mockReplaceAll = vi.fn().mockResolvedValue({
      replaced: 1,
      missed: new Map([["text-1", "not converted"]]),
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
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text><text>Bye</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(result.svg).toBe(input);
    expect(result.replaced).toBe(1);
    expect(result.failed).toBe(true);
    expect(mockDestroy).toHaveBeenCalled();

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

  it("returns original SVG when replaceAll reports missed nodes", async () => {
    const mockReplaceAll = vi.fn().mockResolvedValue({
      replaced: 1,
      missed: new Map([["text-1", "not converted"]]),
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
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text><text>Yo</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(result.failed).toBe(true);
    expect(result.svg).toBe(input);
    expect(result.replaced).toBe(1);
    expect(mockDestroy).toHaveBeenCalled();

    vi.doUnmock("svg-text-to-path/entries/browser-opentypejs.js");
  });

  it("returns original SVG when replaceAll reports errors", async () => {
    const mockReplaceAll = vi.fn().mockResolvedValue({
      replaced: 1,
      missed: new Map(),
      warnings: new Map(),
      errors: new Map([["text-1", new Error("convert error")]]),
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
      '<svg xmlns="http://www.w3.org/2000/svg"><text>Hi</text><text>Yo</text></svg>';
    const result = await convertTextNodesToPaths(input, {
      fontFamilyName: "Dummy",
      fontBuffer: new Uint8Array([0, 1, 2]).buffer,
    });

    expect(result.failed).toBe(true);
    expect(result.svg).toBe(input);
    expect(result.replaced).toBe(1);
    expect(mockDestroy).toHaveBeenCalled();

    vi.doUnmock("svg-text-to-path/entries/browser-opentypejs.js");
  });
});

describe("extractFontFamilyName", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers en, then ja, then default", async () => {
    const mockParse = vi.fn().mockReturnValue({
      names: {
        fontFamily: {
          ja: "日本語名",
          default: "Default Name",
          en: "English Name",
        },
      },
    });
    vi.doMock("opentype.js", () => ({
      default: {
        parse: mockParse,
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new ArrayBuffer(0));
    expect(result).toBe("English Name");

    vi.doUnmock("opentype.js");
  });

  it("falls back to other language entries when preferred keys are missing", async () => {
    const mockParse = vi.fn().mockReturnValue({
      names: {
        fontFamily: {
          fr: "Nom Français",
          zh: "中文名",
        },
      },
    });
    vi.doMock("opentype.js", () => ({
      default: {
        parse: mockParse,
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new ArrayBuffer(0));
    expect(result).toBe("Nom Français");

    vi.doUnmock("opentype.js");
  });

  it("returns null when opentype.parse throws", async () => {
    const mockParse = vi.fn().mockImplementation(() => {
      throw new Error("parse failed");
    });
    vi.doMock("opentype.js", () => ({
      default: {
        parse: mockParse,
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new ArrayBuffer(0));
    expect(result).toBeNull();

    vi.doUnmock("opentype.js");
  });
});

describe("extractFontFamilyName", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("prefers en over ja/default", async () => {
    vi.doMock("opentype.js", () => ({
      default: {
        parse: vi.fn().mockReturnValue({
          names: {
            fontFamily: { ja: "日本語名", en: "English Family", default: "Default" },
          },
        }),
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new Uint8Array([0]).buffer);
    expect(result).toBe("English Family");

    vi.doUnmock("opentype.js");
  });

  it("falls back to another available language key", async () => {
    vi.doMock("opentype.js", () => ({
      default: {
        parse: vi.fn().mockReturnValue({
          names: {
            fontFamily: { fr: "Famille FR", zh: "字體" },
          },
        }),
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new Uint8Array([0]).buffer);
    expect(result).toBe("Famille FR");

    vi.doUnmock("opentype.js");
  });

  it("returns null when parse throws", async () => {
    vi.doMock("opentype.js", () => ({
      default: {
        parse: vi.fn(() => {
          throw new Error("parse failed");
        }),
      },
    }));

    const { extractFontFamilyName } = await import("@core/svg/path-converter");
    const result = await extractFontFamilyName(new Uint8Array([0]).buffer);
    expect(result).toBeNull();

    vi.doUnmock("opentype.js");
  });
});
