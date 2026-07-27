import { CstParser, EOF } from "chevrotain";
import {
  Direction,
  Neutral,
  AttackButton,
  Plus,
  SlideStart,
  SlideEnd,
  Separator,
  Text,
  SettingLine,
  allTokens,
} from "./lexer";

export class TekkenParser extends CstParser {
  constructor() {
    super(allTokens, { recoveryEnabled: false });
    this.performSelfAnalysis();
  }

  diagram = this.RULE("diagram", () => {
    this.MANY(() => {
      this.CONSUME1(SettingLine);
    });
    this.MANY2(() => {
      this.SUBRULE(this.topLevelItem);
    });
    this.CONSUME(EOF);
  });

  topLevelItem = this.RULE("topLevelItem", () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.sequence) },
      { ALT: () => this.SUBRULE(this.slide) },
      { ALT: () => this.SUBRULE(this.text) },
      { ALT: () => this.SUBRULE(this.separator) },
    ]);
  });

  sequence = this.RULE("sequence", () => {
    this.AT_LEAST_ONE(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.direction) },
        { ALT: () => this.SUBRULE2(this.neutral) },
        { ALT: () => this.SUBRULE3(this.attack) },
      ]);
    });
  });

  direction = this.RULE("direction", () => {
    this.CONSUME(Direction);
  });

  neutral = this.RULE("neutral", () => {
    this.CONSUME(Neutral);
  });

  attack = this.RULE("attack", () => {
    this.CONSUME(AttackButton);
    this.MANY(() => {
      this.CONSUME(Plus);
      this.CONSUME2(AttackButton);
    });
  });

  slide = this.RULE("slide", () => {
    this.CONSUME(SlideStart);
    this.AT_LEAST_ONE(() => {
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
