---
name: Shikhbo AI and Bongo AI
description: Two light looks on one set of tokens. Shikhbo AI is a mint-and-white landing page with the working chat in the hero; Bongo AI (centre pages) is off-white with hairlines and blue pill buttons.
colors:
  shikhbo:
    bg: "#ffffff"
    bg-tint: "#e8fcf7"
    text: "#0f172a"
    muted: "#475569"
    line: "#d5dbe3"
    accent: "#00b1b1"
    accent-strong: "#007a7a"
    accent-soft: "#e0f7f5"
    primary: "#0f172a"
    danger: "#b42318"
  bongo:
    bg: "#f6f6f4"
    text: "#171717"
    muted: "#5c5c5c"
    line: "rgb(23 23 23 / 0.14)"
    accent: "#3d5afe"
    accent-soft: "#e6eaff"
    primary: "#3d5afe"
    pastel-yellow: "#ffee99"
    pastel-blue: "#b8ddfa"
    pastel-peach: "#ffc4a3"
typography:
  latin-shikhbo: "DM Sans"
  latin-bongo: "Instrument Sans"
  bangla: "Hind Siliguri (400, 500, 600, 700)"
  h1: "clamp(2.25rem, 5.2vw, 3.625rem) / 1.2, weight 700, -0.02em"
  h2: "clamp(1.625rem, 3.4vw, 2.25rem) / 1.25, weight 700"
  body: "1rem / 1.65"
---

# Design system

The source of truth is `src/app/globals.css` (tokens and component classes) and `hero.ts` (the HeroUI theme used by the class picker). This file describes what is there.

## Two products, one stylesheet

| | Shikhbo AI (`/`, error pages) | Bongo AI (`/c/[slug]`, `/c/[slug]/dashboard`) |
| --- | --- | --- |
| Reference the owner chose | yolearn.ai | indilingo.ai |
| Page | mint glow fading to white (`.mint`) | flat off-white `#f6f6f4` |
| Text | navy `#0f172a`, grey `#475569` | near-black `#171717`, grey `#5c5c5c` |
| Accent | teal: `#00b1b1` for decoration, `#007a7a` for text | blue `#3d5afe` |
| Primary button | navy, 10px corners (16px when large) | blue pill with an arrow |
| Surfaces | white cards with a soft shadow | hairline dividers, white cards, pastel stat cards |
| Latin font | DM Sans | Instrument Sans |

Both use Hind Siliguri for Bangla. The Latin font comes first in the stack so Latin letters and digits use it and Bangla falls through.

Bongo's look is switched on by the `.bongo` class, set in `src/app/c/[slug]/layout.tsx`. It overrides the token values; component classes are shared. Only the layout and colour mood follow the references: no logo, illustration, photo, text or claim is taken from them.

There is one theme, light. No dark theme is shipped.

## Home page structure

1. Floating white navigation bar: brand, section links (large screens), outlined language switch, black "ask" button.
2. Hero: a small pill (free, in Bangla, no app), the headline with its first phrase in a teal gradient, a grey paragraph, the navy primary button and a text link. On the right, the real chat box and class picker inside a laptop frame (`.laptop-screen`, `.laptop-base`) with four labelled chips (`.chip-*`). The chips state only what is true.
3. How it works: three numbered cards.
4. Subjects and classes: subject cards (available ones fill and focus the chat box; the others are disabled and say "coming soon"), then the class list with the same honest states.
5. What it can and cannot do yet: two cards.
6. Questions and answers: `<details>` cards.
7. Dark teal footer with four columns and a large wordmark.

All copy is in `src/data/landing-content.ts`, in Bangla and English. Product facts come from PRODUCT.md: no user counts, testimonials, prices, app-store buttons, tutor photos, voice or video.

## Centre pages structure

- Join: header with a hairline, a pill, a two-tone headline (grey line, then the centre's name), the join-code form with a blue pill button, and a phone frame (`.phone`) holding three pastel cards that say how the centre tutor behaves.
- Chat: header with the centre's name and the language switch; the chat in one white card.
- Dashboard: two-tone headline, the student link in a pill, three pastel stat cards, then sections split by hairlines (title left, content right on wide screens) with hairline rows (`.rows`), and the notes form in a white card.

## Components (class names)

- `.shell` page column (16px gutters on phones); `.shell-narrow` for reading width.
- `.btn` with `.btn-primary`, `.btn-outline`, `.btn-black`, `.btn-lg`. All are at least 44px tall.
- `.link` text action with a 44px target.
- `.pill`, `.chip`, `.card`, `.eyebrow`, `.rows`, `.field`, `.label`, `.error`, `.muted`, `.small`.
- Chat: `.bubble` (the student's question, right), `.prose-answer` (Markdown and KaTeX answer), `.source` (tick and the source line, always shown when the API returns one), `.starter` (starter question chips), `.dots` (waiting).
- `.faq` for `<details>`.

## Accessibility rules

- Body and secondary text pass 4.5:1 on their backgrounds. The light teal `#00b1b1` is never used for text; the headline gradient runs from `#009494` to `#0f3d4a` and is large text.
- Every control shows a 2px focus ring in the accent colour.
- Touch targets are at least 44px.
- Layout holds at 360px wide with no horizontal scroll (covered by a smoke test).
- Motion is limited to a short fade-in on new answers and the waiting dots; both are off under `prefers-reduced-motion`, as is smooth scrolling.
- No emoji. Students are addressed as তুমি, owners as আপনি.
