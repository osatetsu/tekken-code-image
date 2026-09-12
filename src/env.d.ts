declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "svg-text-to-path" {
  export { default } from "svg-text-to-path/entries/browser-opentypejs.js";
}

declare module "svg-text-to-path/entries/browser-opentypejs.js" {
  type FontSourceEntry = {
    wght?: number;
    ital?: number;
    buffer?: ArrayBuffer | Uint8Array;
    source?: string;
  };
  type FontSourceMap = Record<string, FontSourceEntry[]>;
  type SessionParams = {
    fonts?: FontSourceMap;
    providers?: unknown[];
    decimals?: number;
    keepFontAttrs?: boolean;
    loadResources?: boolean;
    [key: string]: unknown;
  };
  type SessionStat = {
    replaced: number;
    missed: Map<unknown, unknown>;
    warnings: Map<unknown, unknown>;
    errors: Map<unknown, unknown>;
  };
  type SessionReplaceStat = {
    textMap: Map<unknown, unknown>;
  };
  export default class Session {
    constructor(svg: SVGSVGElement | string, params?: SessionParams);
    get params(): SessionParams;
    get svg(): SVGSVGElement;
    getSvgString(): string;
    destroy(): void;
    replace(node: SVGSVGElement): Promise<SessionReplaceStat>;
    replaceAll(selector?: string): Promise<SessionStat>;
    createCache(duration: number): unknown;
    static defaultRenderer: unknown;
    static defaultProviders: unknown[];
    static providers: Record<string, unknown>;
    static renderers: Record<string, unknown>;
  }
}
