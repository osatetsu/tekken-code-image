import { createToken, Lexer } from "chevrotain";

export const Direction = createToken({
  name: "Direction",
  pattern: /[12346789]/,
});

export const Neutral = createToken({
  name: "Neutral",
  pattern: /n/i,
});

export const AttackButton = createToken({
  name: "AttackButton",
  pattern: /LP|RP|LK|RK/,
});

export const WideButton = createToken({
  name: "WideButton",
  pattern: /WP|WK/,
});

export const Plus = createToken({
  name: "Plus",
  pattern: /\+/,
});

export const SlideStart = createToken({
  name: "SlideStart",
  pattern: /\[/,
});

export const SlideEnd = createToken({
  name: "SlideEnd",
  pattern: /\]/,
});

export const Separator = createToken({
  name: "Separator",
  pattern: />/,
});

export const Comma = createToken({
  name: "Comma",
  pattern: /,/,
  group: Lexer.SKIPPED,
});

export const Space = createToken({
  name: "Space",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const Text = createToken({
  name: "Text",
  pattern: /"[^"]+"/,
});

export const Icon = createToken({
  name: "Icon",
  pattern: /:[a-zA-Z][a-zA-Z0-9]*:/,
});

export const allTokens = [
  Space,
  Text,
  Icon,
  WideButton,
  AttackButton,
  Direction,
  Neutral,
  Plus,
  SlideStart,
  SlideEnd,
  Separator,
  Comma,
];

export const TekkenLexer = new Lexer(allTokens);
