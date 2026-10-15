/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Earlier versions of the welcome card looks, word for word, by the look
 * they became. A card keeps a copy of its look's stylesheet, so a look that
 * gains a field — the name's colour, 2026-10-02 — does not reach a card
 * that already wears it. A card whose stylesheet is exactly one of these,
 * never edited, is read as the look's current version instead (cleanCard);
 * one that was edited is left as it is.
 */

export const PREVIOUS_CARD_LOOKS = {
  "card-simonsays": [
    ":scope {\n  --color: #ffffff; /* Colour */\n  --ground: #0f0f12; /* Background */\n  --ground2: #27272a; /* Background, far side */\n  background-image: linear-gradient(135deg, var(--ground), var(--ground2));\n}\n\n[data-card=\"avatar\"] { border: 6px solid var(--color); box-shadow: 0 12px 32px rgba(0,0,0,.55); }\n[data-card=\"title\"] { color: var(--color); opacity: .8; }\n[data-card=\"name\"] { color: #ffffff; }\n[data-card=\"subtitle\"] { color: var(--color); opacity: .6; }",
  ],
  "card-cyberpunky": [
    ":scope {\n  --neon: #ffffff; /* Main colour */\n  --ground: #0a0a0b; /* Background */\n  --grid: rgba(255,255,255,.05); /* The grid */\n  background-image:\n    linear-gradient(var(--grid) 1px, transparent 1px),\n    linear-gradient(90deg, var(--grid) 1px, transparent 1px);\n  background-size: 44px 44px;\n  background-color: var(--ground);\n  border: 1px solid rgba(255,255,255,.25);\n  font-family: 'Chakra Petch';\n}\n\n[data-card=\"avatar\"] { border-radius: 0; border: 2px solid var(--neon); }\n[data-card=\"title\"] { font-family: 'VT323'; font-weight: 400; letter-spacing: 6px; color: var(--neon); opacity: 1; }\n[data-card=\"name\"] { text-transform: uppercase; font-weight: 700; color: var(--neon); }\n[data-card=\"subtitle\"] { font-family: 'VT323'; font-weight: 400; font-size: 30px; letter-spacing: 3px; opacity: .7; }",
  ],
  "card-emergency": [
    ":scope {\n  --space: #05060d; /* Space */\n  --line: #111111; /* The outlines */\n  --pill: #aebfd0; /* The title's pill */\n  background-image:\n    radial-gradient(circle at 12% 22%, #ffffff 1px, transparent 2px),\n    radial-gradient(circle at 46% 78%, #ffffff 1px, transparent 2px),\n    radial-gradient(circle at 78% 30%, #ffffffaa 1px, transparent 2px),\n    radial-gradient(circle at 90% 84%, #ffffff 1px, transparent 2px),\n    radial-gradient(circle at 63% 12%, #ffffffaa 1px, transparent 2px);\n  background-color: var(--space);\n  font-family: 'Baloo 2';\n}\n\n[data-card=\"avatar\"] { border: 8px solid var(--line); box-shadow: 0 0 0 6px #ffffff; }\n[data-card=\"title\"] { align-self: flex-start; background-color: var(--pill); color: var(--line); padding: 2px 18px; border-radius: 999px; opacity: 1; letter-spacing: 2px; }\n[data-card=\"name\"] { font-weight: 800; text-shadow: 3px 3px 0 var(--line), -2px -2px 0 var(--line), 2px -2px 0 var(--line), -2px 2px 0 var(--line); }\n[data-card=\"subtitle\"] { font-weight: 700; opacity: .85; }",
  ],
  "card-footage": [
    ":scope {\n  --osd: #f4f4f4; /* The display */\n  --rec: #ff2b2b; /* The REC light */\n  --ground: #0b0b0c; /* Background */\n  background-image:\n    radial-gradient(circle, var(--rec) 58%, transparent 62%),\n    repeating-linear-gradient(0deg, rgba(0,0,0,.5) 0 1px, transparent 1px 3px);\n  background-size: 28px 28px, 100% 100%;\n  background-position: 96% 12%, 0 0;\n  background-repeat: no-repeat;\n  background-color: var(--ground);\n  border: 2px solid rgba(244,244,244,.35);\n  font-family: 'VT323';\n  color: var(--osd);\n}\n\n[data-card=\"avatar\"] { border-radius: 0; border: 3px solid var(--osd); }\n[data-card=\"title\"] { font-weight: 400; font-size: 34px; letter-spacing: 6px; opacity: 1; }\n[data-card=\"name\"] { font-family: 'Special Elite'; font-weight: 400; }\n[data-card=\"subtitle\"] { font-weight: 400; font-size: 30px; letter-spacing: 2px; }",
  ],
};
