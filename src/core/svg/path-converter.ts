import Session from "svg-text-to-path/entries/browser-opentypejs.js";
import opentype from "opentype.js";

export type PathConversionOptions = {
  /** フォントファミリ名 (ConfigProvider に渡すキー)。 */
  fontFamilyName: string;
  /** ユーザがアップロードしたフォントの生バイト列。 */
  fontBuffer: ArrayBuffer | Uint8Array;
  /** Path 座標の小数点以下桁数。省略時は 2。 */
  decimals?: number;
};

export type PathConversionResult = {
  svg: string;
  replaced: number;
  /** 対象 <text> が存在したが、完全に置換できなかったか。 */
  failed: boolean;
};

function countFailedEntries(
  value: unknown,
): number {
  // svg-text-to-path の replaceAll() 統計は実行環境や将来版で
  // Map / Array / plain object / number になりうるため、件数だけを正規化する。
  if (value instanceof Map || value instanceof Set) return value.size;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object") return Object.keys(value).length;
  return 0;
}

/**
 * `<text>` を `<path>` へ変換する。失敗時は元の SVG と failed=true を返す。
 *
 * - Web 版のみで利用するユーティリティ (SPEC.md「Web 版限定: Text → Path 変換」)。
 * - 戻り値の `replaced` は `Session.replaceAll()` の統計値。
 */
export async function convertTextNodesToPaths(
  svgString: string,
  options: PathConversionOptions,
): Promise<PathConversionResult> {
  if (!svgString.includes("<text")) {
    return { svg: svgString, replaced: 0, failed: false };
  }

  const buffer =
    options.fontBuffer instanceof Uint8Array
      ? options.fontBuffer
      : new Uint8Array(options.fontBuffer);

  const fonts = {
    [options.fontFamilyName]: [
      {
        wght: 400,
        ital: 0,
        buffer,
      },
    ],
  };

  const session = new Session(svgString, {
    fonts,
    decimals: options.decimals ?? 2,
  });

  try {
    const stat = await session.replaceAll();
    const replaced = stat?.replaced ?? 0;
    const missed = countFailedEntries(stat?.missed);
    const errors = countFailedEntries(stat?.errors);
    const failed = replaced === 0 || missed > 0 || errors > 0;
    if (failed) {
      return { svg: svgString, replaced, failed: true };
    }
    return { svg: session.getSvgString(), replaced, failed: false };
  } catch {
    // 変換失敗時は元の SVG をそのまま返す。Web 側 UI で警告表示する。
    return { svg: svgString, replaced: 0, failed: true };
  } finally {
    session.destroy();
  }
}

/**
 * フォント ArrayBuffer から内部 family 名を抽出する。
 *
 * - OpenType.js の `font.names.fontFamily` の優先言語 (en / ja / default) を順に探す。
 * - 見つからなければ null を返す (呼び出し側で file name をフォールバックに使う)。
 */
export async function extractFontFamilyName(
  buffer: ArrayBuffer,
): Promise<string | null> {
  try {
    const font = opentype.parse(buffer);
    const names = font.names?.fontFamily;
    if (!names) return null;
    const preferred = ["en", "ja", "default"];
    for (const lang of preferred) {
      const value = names[lang as keyof typeof names];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    for (const value of Object.values(names)) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}
