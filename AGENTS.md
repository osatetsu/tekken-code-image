# AGENTS.md

## Project Overview
Obsidian plugin that converts a custom DSL (Tekken fighting game notation) into SVG images.
Code blocks tagged with ` ```tekken ` are rendered as SVG diagrams.

## Key Specification
All DSL syntax, shape definitions, and design decisions are documented in `SPEC.md`.
Read it first before making any changes. It is the single source of truth for:
- DSL grammar and token rules
- Intermediate representation (`Node` type)
- SVG generation approach (template strings, no library)
- Arrow rotation angles (clockwise, right-facing baseline)
- Error handling strategy

## Tech Stack
- Language: TypeScript
- Parser: Chevrotain (lexer + parser)
- SVG: Template strings only (no SVG libraries)
- Build: esbuild
- Test: Vitest

## Directory Structure
```
src/
  main.ts                  # Plugin entry point
  parser/
    lexer.ts               # Chevrotain token definitions
    parser.ts              # Chevrotain grammar -> Diagram
  svg/
    shapes.svg             # Embedded shape definitions (Inkscape)
    generator.ts           # Diagram -> SVG string
  types/
    index.ts               # Node, Diagram, Settings types
  settings/
    settings.ts            # Obsidian setting definitions
test/
  parser.test.ts
  generator.test.ts
```

## Important Conventions
- `WP`/`WK` expansion happens at parser level (intermediate representation), not SVG generation
- Attack button circles: `fill=none` in definition, fill color applied at render time
- Unspecified buttons: white fill; specified buttons: black (or user-configured color)
- Arrow rotation: clockwise, right-facing (6) as 0° baseline
- Slide brackets: `[` defined once, `]` is `scale(-1,1)` mirror
- Error SVG: 480px fixed width, 16px font, no margin/padding settings applied
- Setting priority: inline `#` settings > Obsidian global settings > defaults
- All units in `px` (including font-size)

## Build & Test
(To be filled after project initialization)
