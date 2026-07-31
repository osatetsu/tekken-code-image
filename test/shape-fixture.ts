import type { ShapeDefinitions } from "../src/svg/shapes";

export const TEST_SHAPES: ShapeDefinitions = {
  "arrow-right": {
    x: -14,
    y: -16,
    width: 28,
    height: 32,
    content:
      '<path id="arrow-right" d="M -2,-8 H -14 V 8 H -2 V 16 L 14,0 -2,-16 Z"/>',
  },
  "neutral-star": {
    x: -16,
    y: -16,
    width: 32,
    height: 32,
    content:
      '<path id="neutral-star" d="M 10,15 0,8 -10,15 -6,4 -16,-3 -4,-4 0,-16 4,-4 16,-4 7,3 Z"/>',
  },
  "slide-left": {
    x: -6,
    y: -32,
    width: 12,
    height: 64,
    content:
      '<path id="slide-left" d="M -6,-32 H 6 C 6,-32 -2,-16 -2,0 -2,16 6,32 6,32 H -5 Z"/>',
  },
  "slide-right": {
    x: -6,
    y: -32,
    width: 12,
    height: 64,
    content:
      '<path id="slide-right" d="M 6,-32 H -6 C -6,-32 1,-16 1,0 1,16 -5,32 -5,32 H 6 Z"/>',
  },
  separator: {
    x: -4,
    y: -8,
    width: 8,
    height: 16,
    content: '<path id="separator" d="M -4,-8 4,0 -4,8"/>',
  },
  attack: {
    x: -26,
    y: -28,
    width: 52,
    height: 56,
    content:
      '<circle id="LP" fill="none" cx="-14" cy="-8" r="12"/><circle id="LK" fill="none" cx="-10" cy="16" r="12"/><circle id="RP" fill="none" cx="10" cy="-16" r="12"/><circle id="RK" fill="none" cx="14" cy="8" r="12"/>',
  },
};
