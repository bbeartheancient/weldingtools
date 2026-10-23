# Welding & Measuring Trainer

Tape Measure, Caliper, Weld Symbols

## How to Open

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge). No server required — it works from `file://`. You can also serve it with any HTTP server:

```bash
cd apps/measuring
python3 -m http.server 8080
# Open http://localhost:8080
```

## Three Modules

**Tape Measure** — Read measurements from a tape. Choose the precision (1/8", 1/16", 1/32", etc.), ruler length, and answer format (fractions or decimals).

**Dial Caliper** — Read a dial caliper. Choose inch or metric units, resolution (0.001", 1/64", etc.), and mode (type, find, or trainer).

**Welding Symbols** — AWS A2.4 welding symbols. Three quiz modes: Identify (name a highlighted part), Read (interpret a symbol), and Build (construct a symbol from a spec).

## Settings

Each module has its own settings panel (gear icon). Settings are saved to your browser's localStorage automatically — your preferences persist between sessions.

**Tape settings:**
- Question precision: which fractions to ask about (1", 1/2", 1/4", 1/8", 1/16", 1/32", 1/64")
- Mark precision: which ticks to draw on the ruler (must be ≥ question precision)
- Ruler length: 6" or 12"
- Notation: accept fractions or decimals
- Fraction style: reduced (1/2") or unsimplified (2/4")
- Mode: Type (read a position) or Find (locate a value)

**Caliper settings:**
- Unit: inch or metric
- Resolution: 0.001", 1/8", 1/16", 1/32", 1/64" (inch) or 0.1mm, 0.01mm (metric)
- Mode: Type, Find, or Trainer
- Auto-dial: dial auto-advances as you move the jaw (caliper realism)
- Fine adjust: 0.001" (inch) or 0.01mm (metric) step

**Welding settings:**
- Quiz mode: Identify, Read, or Build

## Scoring

- Points scale with level: 10 pts at level 1, up to 100 pts at level 10
- Level up after every 10 correct answers
- 3 strikes = game over
- No time limit — take as long as you need

## File Map

```
apps/measuring/
├── index.html          # Entry point (3-tab interface)
├── core.js             # Shared engine: settings, scoring, tabs
├── style.css           # Classroom-friendly styling
├── tape-logic.js       # Tape measure pure logic
├── tape.js             # Tape measure canvas rendering
├── caliper-logic.js    # Dial caliper pure logic
├── caliper.js          # Dial caliper canvas rendering
├── weld.js             # Welding symbols (logic + rendering)
├── FACTS.md            # Extracted game rules (from deobfuscation)
├── PLAN.md             # Development checklist
├── src/                # Original + deobfuscated game files
├── ref/                # AWS welding symbol references
├── tests/              # Node-based unit tests (one per module)
└── tools/              # Development tooling (deobfuscation, analysis)
```

## Technical Notes

- Vanilla JavaScript (ES5), no external dependencies
- All graphics drawn with Canvas 2D API
- Works offline — no network requests
- Tested on Node.js v26 (logic tests) and browsers (visual)
