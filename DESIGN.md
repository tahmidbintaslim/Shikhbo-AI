---
name: Shikhbo AI
description: A homework tutor written on one page of a ruled school exercise copy.
colors:
  paper: "#fdfeff"
  rule: "#c3daf2"
  margin: "#e0563f"
  ink: "#1d3a9e"
  ink-deep: "#132769"
  lead: "#1c2333"
  pencil: "#4a5670"
  red-ink: "#c21f30"
  highlight: "#fff2a8"
typography:
  display:
    fontFamily: "Tiro Bangla, serif"
    fontSize: "clamp(2rem, 6.2vw, 3.25rem)"
    fontWeight: 400
    lineHeight: "4rem"
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Tiro Bangla, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: "2rem"
  body:
    fontFamily: "Hind Siliguri, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: "2rem"
  action:
    fontFamily: "Hind Siliguri, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.25
  label:
    fontFamily: "Hind Siliguri, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: "2rem"
  small:
    fontFamily: "Hind Siliguri, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "2rem"
rounded:
  none: "0"
  ruled: "2px"
spacing:
  line: "2rem"
  line-2: "4rem"
  gutter: "2rem"
  gutter-wide: "clamp(4rem, 12vw, 11rem)"
  inset: "0.875rem"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.ruled}"
    padding: "0 0.875rem"
    height: "{spacing.line}"
  button-disabled:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pencil}"
  button-fill:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    typography: "{typography.action}"
    rounded: "{rounded.ruled}"
    padding: "0 0.875rem"
    height: "3rem"
  button-fill-hover:
    backgroundColor: "{colors.ink-deep}"
    textColor: "#ffffff"
  button-fill-disabled:
    backgroundColor: "{colors.pencil}"
    textColor: "#ffffff"
  link:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  link-hover:
    textColor: "{colors.ink-deep}"
  link-disabled:
    textColor: "{colors.pencil}"
  field:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0"
    height: "{spacing.line}"
  field-label:
    textColor: "{colors.pencil}"
    typography: "{typography.label}"
  source-reference:
    textColor: "{colors.red-ink}"
    typography: "{typography.label}"
  error-text:
    textColor: "{colors.red-ink}"
    typography: "{typography.body}"
---

# Design System: Shikhbo AI

## Overview

**Creative North Star: "The Exercise Copy"**

Every screen is one page of a ruled school exercise copy (khata): white paper, pale blue rules, one red margin line down the left. The student writes the question on a line in ballpoint blue; the answer comes back as worked steps in dark lead, and the teacher's red pen adds only its marks: a tick in the margin and the page the answer came from. The same page serves the home tutor, a coaching centre's tutor, the join screens, the owner's dashboard, and the 404, error and loading states.

The paper is the only surface. Nothing floats above it, nothing is boxed off from it, and the page background is never covered by a panel. Structure comes from the lines themselves: all text has a line-height of one rule (2rem) and all vertical gaps are whole rules, so words rest on the blue lines the whole way down. Density is that of handwriting on ruled paper: one idea per line, generous but never airy.

The system has one light theme. It is built for a parent and a young child on a phone, in Bangla first, so type is large, contrast is high, and controls are plain words in pen.

**Key Characteristics:**
- One surface: ruled paper drawn on the page background, with the red margin line.
- A 2rem line grid that every text line and every vertical gap obeys.
- Three writing hands: ballpoint blue (student and actions), lead (the worked answer), teacher's red (marks only).
- Hand-ruled boxes and underlines instead of cards, panels and pills.
- A printed textbook face for headings, a plain face for everything written on the lines.

## Colors

The palette is a stationery box: paper, the two printed line colors, two inks, a pencil and a highlighter.

### Primary
- **Ballpoint Blue** (`ink`): what the student writes and everything that can be tapped. Question text, text typed in fields, the field's writing line, button borders and labels, the filled send action, dotted tap-links.
- **Ballpoint Blue, pressed hard** (`ink-deep`): headings, bold text and totals inside answers, hover on links and filled buttons, the focus ring, selected text.

### Secondary
- **Teacher's Red** (`red-ink`): the teacher's marks only. The margin tick beside a finished answer, the source/page reference, error messages, the writing line of an invalid field, and a dashboard count that needs the owner's attention (questions the notes could not answer).

### Tertiary
- **Highlighter Yellow** (`highlight`): text selection at full strength, and a 45% wash behind the field being written in.

### Neutral
- **Copy Paper** (`paper`): the page. Also the fill of an outlined button, so the rules do not run through its label.
- **Printed Rule Blue** (`rule`): the horizontal rules, the scrollbar thumb, and at 30 to 45% the tint behind inline code and code blocks in an answer.
- **Margin Red** (`margin`): the 2px vertical margin line. A printed line, not a pen: it is never used for text or marks.
- **Lead** (`lead`): the worked answer and default body text.
- **Pencil Grey** (`pencil`): secondary text: subtitles, help lines, field labels, placeholders, empty states, dotted leaders, and anything disabled.

White (`#ffffff`) appears once, as the label on a filled button.

### Named Rules
**The Three Hands Rule.** Blue is the student and anything tappable, lead is the worked answer, red is the teacher. A color is chosen by who is writing, never by emphasis.

**The Red Pen Rule.** `red-ink` only marks: tick, source reference, error, a count that needs attention. It is never a button, a link, a heading or a decoration. The margin line has its own red (`margin`) and the two are not interchangeable.

## Typography

**Display Font:** Tiro Bangla (with serif), weight 400 only
**Body Font:** Hind Siliguri (with system-ui, sans-serif), weights 400, 500, 600, 700

**Character:** Tiro Bangla is the printed voice of a Bangla textbook, used only for headings. Hind Siliguri is the plain hand for everything written on the lines. Both carry Bengali and Latin, so mixed-language lines stay in one face.

### Hierarchy
- **Display** (400, `clamp(2rem, 6.2vw, 3.25rem)`, line-height 4rem = two rules, -0.01em, `ink-deep`): the home page heading only.
- **Headline** (400, 1.5rem, line-height 2rem, `ink-deep`): section headings, the brand line in the page header, and the page heading on centre, join, dashboard, 404 and error pages.
- **Body** (400, 1.0625rem, line-height 2rem, `lead`): answers and running text. Supporting paragraphs are capped at 60ch. Headings inside a Markdown answer stay at body size in weight 700, `ink-deep`.
- **Action** (600, 1.0625rem): button labels. Tap-links use body at weight 500.
- **Label** (600, 0.9375rem, line-height 2rem): field labels in `pencil`; the source reference in `red-ink`, right-aligned.
- **Small** (400, 0.9375rem, line-height 2rem, `pencil`): help text, statuses, footers, "Powered by Bongo AI".

### Named Rules
**The One Line Rule.** Every text style has a line-height that is a whole number of rules. Size changes; the line does not. There are two sizes of running text (1.0625rem and 0.9375rem) and nothing smaller.

**The Printed Heading Rule.** Tiro Bangla is for page and section headings only, always weight 400. Emphasis inside text is Hind Siliguri weight, not the heading face.

## Layout

The page background draws the copy: horizontal rules every 2rem (`--line`), offset by 1.56rem (`--rule-offset`) so each rule falls just under the text baseline, and a vertical margin line at `--gutter` from the left edge. The gutter is 2rem on phones and `clamp(4rem, 12vw, 11rem)` from 48rem up.

All content sits in the writing area: left padding is the gutter plus 0.875rem, right padding 1rem, maximum width 72rem plus the gutter. Content is left-aligned against the margin line and never centered on the page. Narrow pages cap the writing area: join, 404 and error at 36rem with forms at 24rem; centre chat and dashboard at 48rem.

Vertical spacing is counted in rules: one rule (2rem) between related blocks and above a form's action; two rules (4rem) between dashboard sections, above the footer and above the heading of a narrow page. Page headers start one rule down. Nothing uses a vertical margin, padding or border that is not a whole rule, because one stray pixel pushes every later line off the rules.

The home page is a 12-column grid from 64rem up (question and answer in 7 columns, the subjects index in 5, 4rem column gap) and a single column below, with the index after the conversation. Header rows wrap rather than shrink.

Only the margin belongs to the teacher: the tick is positioned out of flow, centered in the gutter beside the last line of the answer.

## Elevation & Depth

Flat. There are no shadows, no layered surfaces, no blur and no tonal panels. Depth is not conveyed; everything is ink on one sheet. The only element that sits above the page is the class picker's dropdown, which is a paper-colored box with a 1.5px ballpoint border and no shadow.

### Named Rules
**The One Sheet Rule.** If an element needs a background to separate it from the page, it is the wrong element. Use a ruled box, an underline or a blank line.

## Shapes

Shapes are what a pen and a ruler make. Boxes have square corners softened only by the pen (2px radius) and a 1.5px line. Fields have no box at all: they are a 1.5px line. Lists are separated by the page's own rules, never by dividers. Tap-links carry a 1.5px dotted underline; contents rows carry a 2px dotted leader. The one drawn mark is the tick: a single 2.5px round-capped stroke. There are no pills, circles, cards or icons-in-shapes.

Gradients exist only as the drawing tool for the rules, the margin line and field lines (hard-stopped, single color). There are no visible color blends.

## Components

### Buttons
A hand-ruled box, one line tall, so it sits between two rules.
- **Shape:** 1.5px `ink` border, 2px radius, 0 0.875rem padding, min-height 2rem, weight 600.
- **Outlined (default):** `paper` fill, `ink` label. Used for secondary actions: language switch, start over, choose a file.
- **Filled:** `ink` fill, white label, 3rem tall with 0.5rem of margin above and below so it occupies exactly two rules. One per form or view: send, join, save, retry, go home.
- **Hover / Active:** outlined gets a 9% `ink` tint; filled goes to `ink-deep`; both move down 1px when pressed. Transitions are 160ms ease-out on color, 80ms on the press.
- **Disabled:** border and label (or fill) turn `pencil`.
- **Touch:** the 2rem-tall button and tap-links extend their hit area 6px above and below with an invisible overlay to reach 44px without leaving the line grid.

### Tap-links
Text you tap, written in pen: starter questions, index rows, "new page", "save", "delete".
- **Style:** `ink`, weight 500, 1.5px dotted underline offset 0.3em, left-aligned.
- **Hover:** `ink-deep`, underline turns solid.
- **Disabled:** `pencil`, no underline.
- Ordinary inline links are `ink` with a solid underline.

### Inputs / Fields
A field is the line you write on.
- **Style:** no border, no radius, no padding, transparent. A 1.5px `ink` line is drawn exactly over the page's rule under each line of text; a multi-line field shows one line per row and grows with its content. Typed text is `ink`; the placeholder is `pencil`; the caret is `ink`.
- **Focus:** the line turns `ink-deep` and the field gets a 45% `highlight` wash. This replaces the outline for fields only.
- **Error:** the line turns `red-ink`, and the help line below is replaced by the error in `red-ink` weight 500.
- **Label and help:** label above (Label style, `pencil`), help below (Small).

### Contents rows (dotted leader)
The copy's index page: a name on the left, a value on the right, joined by a 2px dotted `pencil` leader on the baseline. Used for the subjects index, dashboard counts, most-asked notes and the notes list. The right-hand value may be a status in Small, a number in `ink-deep` (or `red-ink` when it needs attention), or a tap-link.

### Conversation
The chat is the page, not a box. A question is one paragraph in `ink` led by a bold "Question:" label; the answer follows in `lead` as Markdown kept on the lines (lists indented 1.5rem, tables without borders, code tinted with `rule`, display math with one rule above and below). The source reference sits right-aligned beneath in `red-ink`, and the tick is drawn in the margin beside the answer's last line. Turns are separated by one blank rule. Conversation tools sit right-aligned above as small tap-links.

**Motion (signature):** a new answer is written onto the page. Each block is revealed left to right (clip-path, 520ms, `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 140ms), the source reference follows at 820ms, and the tick is drawn last at 900ms. While waiting, a pencil-grey "writing" line ends in a blinking 2px `ink` caret; the same caret line is the page-loading state. All of it is off under reduced motion. Nothing else on the page animates beyond button color and press.

### Navigation
There is no navigation bar. The header is the copy's cover label: the name on the left in Headline, and on the right the fields a cover would carry (class picker, language switch as an outlined button). It wraps onto two lines on phones.

### Class picker
The one library component (HeroUI Select, underlined variant), themed to match a field: 2rem tall, 1.5px `ink` bottom line, weight 600 `ink` value, no shadow. Its dropdown is a `paper` box with a 1.5px `ink` border and 2px radius; the selected row is tinted with `rule`. Classes that are not ready are listed but cannot be picked, with "coming soon" after the name.

### Focus
Everything except fields shows a 2px `ink-deep` outline offset 2px.

## Do's and Don'ts

### Do:
- **Do** keep every line-height and every vertical gap a whole number of 2rem rules, so text rests on the lines to the bottom of the page.
- **Do** start all content at the margin line (gutter + 0.875rem) and leave the gutter empty except for the teacher's tick.
- **Do** choose color by the hand that writes: `ink` for the student and actions, `lead` for the worked answer, `red-ink` for the teacher's marks.
- **Do** use a ruled box (1.5px `ink`, 2px radius) for an action and a 1.5px line for a field.
- **Do** show name-and-value pairs as contents rows with a dotted leader.
- **Do** use one filled button per form or view; everything else is outlined or a tap-link.
- **Do** set headings in Tiro Bangla 400 and everything else in Hind Siliguri, at 0.9375rem or larger.
- **Do** honor reduced motion: the written-answer reveal, the tick and the caret are all disabled under it.

### Don't:
- **Don't** put a card, panel or filled container over the page. The ruled paper stays visible behind all content.
- **Don't** add shadows, blur, glass or visible color gradients. Gradients are only the hard-stopped lines of the paper and fields.
- **Don't** use `red-ink` for buttons, links, headings or decoration, and don't use `margin` red for text.
- **Don't** add borders, dividers, padding or odd line-heights inside flowing content; they push every later line off the rules.
- **Don't** round anything beyond 2px or use pill and circle shapes.
- **Don't** add a dark theme; the system is one light sheet.
- **Don't** center body content or float it away from the margin line.
- **Don't** animate anything other than the answer being written, the tick, the caret, and button color and press.
