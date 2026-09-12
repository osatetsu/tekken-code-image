import Session from "svg-text-to-path/entries/browser-opentypejs.js";

export type PathConversionOptions = {
  /** フォントファミリ名 (ConfigProvider に渡すキー)。 */
  fontFamilyName: string;
  /** ユーザがアップロードしたフォントの生バイト列。 */
  fontBuffer: ArrayBuffer | Uint8Array;
  /** Path 座標の小数点以下桁数。省略時は 2。 */
  decimals?: number;
};

/**
 * `<text>` を `<path>` へ変換した SVG 文字列を返す。
 *
 * - Web 版のみで利用するユーティリティ (SPEC.md「Web 版限定: Text → Path 変換」)。
 * - 入力 SVG は `generateSvg()` が出力した文字列を想定。
 * - 戻り値は `<text>` が `<path>` に置換された SVG 文字列。失敗時は入力をそのまま返す。
 */
export async function convertTextNodesToPaths(
  svgString: string,
  options: PathConversionOptions,
): Promise<string> {
  if (!svgString.includes("<text")) {
    return svgString;
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
    await session.replaceAll();
    return session.getSvgString();
  } catch (e) {
    // 変換失敗時は元の SVG をそのまま返す。Web 側 UI で警告表示する。
    return svgString;
  } finally {
    session.destroy();
  }
}
