export type Direction = 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9;
export type Button = "LP" | "RP" | "LK" | "RK";

export type Node =
  | { type: "arrow"; direction: Direction }
  | { type: "neutral" }
  | { type: "attack"; buttons: Button[] }
  | { type: "slide-start" }
  | { type: "slide-end" }
  | { type: "separator" }
  | { type: "text"; value: string };

export type Diagram = {
  nodes: Node[];
};

export type Settings = {
  shapeSize: number;
  padding: number;
  margin: number;
  fontFamily: string | null;
  fontSize: number;
  textFillColor: string;
  textStrokeColor: string;
  textStrokeWidth: number;
  attackColors: AttackColors;
  debugMode: boolean;
};

export type AttackColors = {
  LP: ButtonColor;
  RP: ButtonColor;
  LK: ButtonColor;
  RK: ButtonColor;
};

export type ButtonColor = {
  pressed: string;
  unpressed: string;
};

export const DEFAULT_SETTINGS: Settings = {
  shapeSize: 32,
  padding: 8,
  margin: 8,
  fontFamily: null,
  fontSize: 24,
  textFillColor: "#ffffff",
  textStrokeColor: "#a3a3a3",
  textStrokeWidth: 4,
  attackColors: {
    LP: { pressed: "#000000", unpressed: "#ffffff" },
    RP: { pressed: "#000000", unpressed: "#ffffff" },
    LK: { pressed: "#000000", unpressed: "#ffffff" },
    RK: { pressed: "#000000", unpressed: "#ffffff" },
  },
  debugMode: false,
};
