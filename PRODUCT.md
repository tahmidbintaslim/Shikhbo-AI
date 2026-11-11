# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two products share this codebase.

- **Shikhbo AI.** Parents of Class 1 to 5 children in Bangladesh, on a phone in the evening, who cannot help with every homework question. The child types or reads the answer; the parent decides whether to trust and pay. Bangla first, English second.
- **Bongo AI (coaching-centre pilot).** Students of one coaching centre, at home after class and often late, asking about that centre's notes. And the centre's owner, who checks once a week what the batches did not understand and adds notes.

## Product Purpose

Shikhbo explains a homework question step by step, from the child's own NCTB textbook where it can. Bongo gives a coaching centre its own tutor that answers only from the centre's notes and shows the owner what students asked. Success for Shikhbo is a parent who returns weekly; for Bongo, a centre that pays after a pilot.

## Positioning

- Shikhbo: built for the primary years and for parents, where exam-prep apps for older students are not.
- Bongo: answers come only from the centre's own material, under the centre's own name, and the owner sees the gaps. If the notes do not cover a question, the tutor says so instead of answering from general knowledge.

## Operating Context

- Phones first, often on mobile data. Homework is in paper books and exercise copies.
- Centre students open a link the centre shares and enter a join code once. The owner opens a dashboard with an owner code.
- Payment in Bangladesh is by bKash and Nagad; nothing is charged in the app today.

## Capabilities and Constraints

- Built: chat tutor with class and language pickers; textbook lookup for four Class 1 books; per-centre tutor at `/c/<slug>`; owner dashboard at `/c/<slug>/dashboard` with 7-day counts, most-asked notes, unanswered questions and text notes upload.
- Not built: photo questions, hints before answers, the parent's weekly view, accounts, payment, PDF upload. Do not show these as available.
- Classes 2 to 12 and several subjects are "coming soon" and cannot be picked.
- The tutor never uses emoji and speaks like a calm teacher.
- Stack: Next.js 16, React 19, Tailwind CSS 4, HeroUI. Bangla UI strings are the default.

## Brand Commitments

- Names: "শিখবো AI" / "Shikhbo AI"; centre pages carry the centre's own name, with "Powered by Bongo AI" small.
- Voice: plain, calm, patient. Students are addressed as তুমি, owners as আপনি. No cheering, no emoji.

## Evidence on Hand

- No testimonials, user counts, prices or press. The current landing page has a Testimonials component; nothing in it may be presented as real.
- The live site is https://shikhbo-ai.vercel.app.

## Product Principles

1. Honest about limits: say what is not in the book or the notes, and what is not built.
2. The child's or the centre's own material comes first, general knowledge second or not at all.
3. Bangla first, readable on a small phone.
4. Teach the steps, then the answer.

## Accessibility & Inclusion

Young readers and parents with mixed reading confidence: large, clear Bangla type, high contrast, and controls that work by touch and keyboard.
