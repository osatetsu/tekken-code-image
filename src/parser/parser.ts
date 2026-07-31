import { CstParser, EOF } from "chevrotain";
import {
  Direction,
  Neutral,
  AttackButton,
  WideButton,
  Plus,
  SlideStart,
  SlideEnd,
  Separator,
  Text,
  Icon,
  allTokens,
} from "./lexer";

export class TekkenParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: false });
    this.performSelfAnalysis();
  }

  diagram = this.RULE("diagram", () => {
    this.MANY(() => {
      this.SUBRULE(this.element);
    });
    this.CONSUME(EOF);
  });

  element = this.RULE("element", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.direction) },
      { ALT: () => this.SUBRULE(this.neutral) },
      { ALT: () => this.SUBRULE(this.buttonPress) },
      { ALT: () => this.SUBRULE(this.slidePress) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.separator) },
      { ALT: () => this.CONSUME(Icon) },
    ]);
  });

  button = this.RULE("button", () => {
    this.OR([
      { ALT: () => this.CONSUME(AttackButton) },
      { ALT: () => this.CONSUME(WideButton) },
    ]);
  });

  buttonPress = this.RULE("buttonPress", () => {
    this.SUBRULE(this.button);
    this.MANY(() => {
      this.CONSUME(Plus);
      this.SUBRULE2(this.button);
    });
  });

  direction = this.RULE("direction", () => {
    this.CONSUME(Direction);
  });

  neutral = this.RULE("neutral", () => {
    this.CONSUME(Neutral);
  });

  slidePress = this.RULE("slidePress", () => {
    this.CONSUME(SlideStart);
    this.CONSUME(AttackButton);
    this.CONSUME2(AttackButton);
    this.MANY(() => {
      this.CONSUME3(AttackButton);
    });
    this.CONSUME(SlideEnd);
  });

  text = this.RULE("text", () => {
    this.CONSUME(Text);
  });

  separator = this.RULE("separator", () => {
    this.CONSUME(Separator);
  });
}

export const parser = new TekkenParser();
