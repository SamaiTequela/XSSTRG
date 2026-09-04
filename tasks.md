# Active Debate Phase — UI Architecture & Implementation Plan

This document maps out the component hierarchy, design system, state model, and animation strategy for the **Active Debate Phase** of the multi-player debate game (*Point of Order*).

---

## 1. Stack & Architecture

- **Core**: React (Functional components, hooks, typed props)
- **Fluid Layout Animations**: Motion (`framer-motion` / `motion`)
- **Iconography**: `lucide-react`
- **Styling**: Tailored Design System with Vanilla CSS tokens (glassmorphism, parliamentary dark/light themes, 8pt spatial grid, balanced typography)
- **Runtimes / Tooling**: Vite + React for lightning-fast HMR and responsive preview

---

## 2. Design System & Aesthetic Foundation

The aesthetic is styled after a modern parliamentary dispatch box / high-stakes debate chamber: intellectual, stately, high-contrast, and dynamic.

### 2.1 Typography System
| Role | Font Family | Usage |
|---|---|---|
| **Display & Headings** | `Bricolage Grotesque`, sans-serif | Room masthead, motion title, speaker names, modal headers |
| **Debate Text / Speeches** | `Newsreader` (or `Merriweather`), serif | Speech transcripts, argument input area, rationale |
| **Data, Clocks & Metadata** | `Space Mono` / monospace with `tabular-nums` | Chess clock countdowns, prep timers, turn counters, word counts |

### 2.2 Color Tokens & Chamber Palette
- **Ground / Surface**: 
  - *Light*: Cream ground (`#f4f3ef`), Card surface (`#ffffff`), Chamber contrast (`#ecebe4`)
  - *Dark*: Deep obsidian (`#121218`), Card surface (`#1e1e27`), Chamber contrast (`#16161d`)
- **Proposition (For the Motion)**:
  - Base: `#0f7a63` (Dark mode: `#40bda0`)
  - Tint/Background: `#e2f0eb` (Dark mode: `#12302a`)
  - Line/Border: `#a9d5c8` (Dark mode: `#235045`)
- **Opposition (Against the Motion)**:
  - Base: `#b8422c` (Dark mode: `#ec7a60`)
  - Tint/Background: `#f7e6e1` (Dark mode: `#381e17`)
  - Line/Border: `#e6bcae` (Dark mode: `#5c3025`)
- **Adjudicator / Moderator Brass**:
  - Accent: `#9c7726` (Dark mode: `#c9a24b`)
  - Royal Indigo Accent: `#34348a` (Dark mode: `#a6a4f0`)

---

## 3. Active Debate Component Hierarchy

```
DebateView (Active Debate Stage)
│
├── DebateHeader
│   ├── RoomMetaBadge (Code, Connection status, Turn number)
│   ├── MotionBanner (Motion headline, "This House Believes", Category badge)
│   └── SpectatorJuryBadge (Live judge count, Crowd/AI mode indicator)
│
├── ChessClockArena (Dual synchronized clocks + VS Spine)
│   ├── ClockCard (Proposition - "For the motion")
│   │   ├── SpeakerIdentity (Avatar badge, name, side indicator)
│   │   ├── TimeDisplay (Tabular countdown, low-time warning indicator)
│   │   └── ActiveSpeakerIndicator (Pulsing soundwave / live beacon)
│   ├── CenterSpine (Turn counter, round progress, VS badge)
│   └── ClockCard (Opposition - "Against the motion")
│       ├── SpeakerIdentity (Avatar badge, name, side indicator)
│       ├── TimeDisplay (Tabular countdown, low-time warning indicator)
│       └── ActiveSpeakerIndicator (Pulsing soundwave / live beacon)
│
├── PrepTimeBanner (Conditional Motion Component)
│   ├── PrepClock (Animated progress ring/bar, countdown seconds)
│   ├── PrepMessage ("Prep time: Organise your thoughts before your clock starts")
│   └── SkipPrepButton ("Start speaking now" action)
│
├── DebateWorkspace (Split on Desktop, Tabbed/Stacked on Mobile)
│   │
│   ├── SpeakingDispatch (Active Floor / Rebuttal Scratchpad)
│   │   ├── FloorStatusHeader (Who holds the floor, role pill, live indicator)
│   │   ├── SpeechEditor (High-legibility serif textarea, auto-grow, spellcheck)
│   │   ├── EditorMetrics (Live word counter, estimated speech duration, character quota)
│   │   ├── FloorActionControls
│   │   │   ├── SubmitTurnButton (Primary CTA: "Submit & Pass Floor →")
│   │   │   ├── RequestEndButton (Secondary: "Request Early Conclusion")
│   │   │   └── ConcedeButton (Secondary: "Concede Turn / Motion")
│   │   └── OpponentScratchpad (Private notes tab available while waiting for opponent)
│   │
│   └── DebateRecord (Live Chronological Transcript)
│       ├── TranscriptHeader (Total turns, speech volume, export/copy transcript)
│       ├── TranscriptStream (Virtualized/animated turn feed)
│       │   └── TurnCard (Proposition vs Opposition styling)
│       │       ├── TurnMeta (Speaker, side badge, turn number, time elapsed)
│       │       ├── TurnBody (Formatted speech text)
│       │       └── TurnBadges (e.g. "Opening", "Rebuttal", "Concession")
│       └── EmptyRecordNotice (Initial placeholder before first speech)
│
├── JuryObservationPanel (Shown if user is spectator/judge in Crowd Jury mode)
│   ├── JuryStatus ("You are observing as a judge")
│   └── QuickScoreNotes (Private notes preserved for the scoring phase)
│
├── MobileControlBar (Mobile view bottom dock)
│   ├── FloorVsRecordToggle (Quick switcher between Floor editor and Transcript)
│   ├── MobileClockSummary (Compact synchronized mini-clock)
│   └── MobileQuickSubmit (Thumb-friendly primary action)
│
└── TurnHandoffModal (Hot-seat one-screen mode pass-over sheet)
    ├── NextSpeakerAnnouncement ("Pass the device to [Name]")
    ├── ReadyCheckAction ("I am ready to speak")
    └── PrepCountdownWidget
```

---

## 4. Motion Animation Strategy

1. **Active Turn Transition (`layout` + `AnimatePresence`)**:
   - When floor passes from Proposition to Opposition, the active glow, scale lift, and border halo transition with a smooth spring (`type: "spring", stiffness: 350, damping: 28`).
2. **Clock Urgency Pulsing**:
   - When remaining time drops below 60s, smooth rhythmic color pulse; below 30s, elevated heart-rate pulse on the active clock badge.
3. **Prep Time Countdown Transition**:
   - `PrepTimeBanner` enters via smooth slide-down and collapse-exit when speaker starts or prep expires.
4. **Transcript Card Entrances**:
   - New speech bubbles slide up with slight spring and opacity fade (`y: 16 -> 0, opacity: 0 -> 1`).
5. **Mobile Viewport Transitions**:
   - Fluid sliding transition when toggling between "The Dispatch Floor" and "The Record".

---

## 5. Phased Implementation Tasks

### [x] Task 1: Environment & Project Setup
- [x] Initialize React + Vite + Motion + Lucide React app structure in the workspace.
- [x] Install / link dependencies (`react`, `react-dom`, `motion`, `lucide-react`, `vite`, `@vitejs/plugin-react`).
- [x] Configure `vite.config.js` and HTML template with Google Fonts (`Bricolage Grotesque`, `Newsreader`, `Space Mono`).

### [x] Task 2: Core Design System & CSS Tokens
- [x] Implement `src/styles/design-tokens.css` with semantic variables (ground, surface, chamber, proposition, opposition, brass, shadows).
- [x] Implement typography utility classes and responsive spatial grid rules.
- [x] Support seamless dark/light theme switching.

### [x] Task 3: Component Implementation
- [x] `DebateHeader.jsx`: Motion display, room code, jury badge, theme switch.
- [x] `ChessClocks.jsx`: Dual synchronized Proposition/Opposition clocks with spring layout animations and low-time states.
- [x] `PrepTimeBanner.jsx`: Animated prep time alert with progress bar and "Start speaking now" action.
- [x] `SpeakingDispatch.jsx`: Argument editor, word count, pass floor action, anti-paste protection, opponent rebuttal scratchpad.
- [x] `TranscriptRecord.jsx`: Chronological speech bubble stream with motion entry and formatted turns.
- [x] `TurnHandoffModal.jsx`: Device pass-over modal for hot-seat play.
- [x] `MobileControlBar.jsx`: Mobile view dock and drawer controls.

### [x] Task 4: Interactive Simulation & Layout Assembly
- [x] Assemble `DebateStage.jsx` with simulated debate state (active clocks, turn switching, speech typing, adding turns to transcript).
- [x] Seed realistic multi-turn debate arguments to evaluate typography and spacing immediately.

### [x] Task 5: Browser Verification & Review Artifacts
- [x] Launch local dev server at `http://localhost:5173` (HTTP 200 confirmed).
- [x] Build and test production bundle (`vite build` passed in 2.98s).
- [x] Provide walkthrough document detailing typography, spacing hierarchy, and live interactive controls.

### [x] Task 6: Jury Deliberation & Scoring Phase
- [x] Implement `JuryScoringStage.jsx` adhering to obsidian chamber design system.
- [x] Pin motion banner at the top with category badges and debate metadata.
- [x] Create side-by-side 1–10 scoring cards for Proposition and Opposition with custom sliders and real-time qualitative rubric feedback.
- [x] Implement synchronized 2-minute deliberation countdown clock with animated progress bar.
- [x] Integrate juror remarks textarea and anonymous panel status bar (Judge 1, You [Judge 2], Judge 3).
- [x] Add persistent theme handling via localStorage.
- [x] Add slide-over drawer labeled "Review The Record" allowing judges to reference the debate transcript while scoring.
- [x] Enlarge slider thumb targets (30px) and boost speaker name typography weight (900).

### [x] Task 7: Verdict & Adjudication Reveal Screen
- [x] Implement `VerdictStage.jsx` with celebratory winner announcement banner (Trophy crest, margin badge, executive adjudication rationale).
- [x] Add Key Clashes & Arguments matrix with interactive expanders revealing cited debate quotes from the record.
- [x] Create Anonymous Juror Scorecard breakdown displaying per-judge votes and written commentary.
- [x] Add post-debate actions (Start New Debate, Rematch with Same Motion, Share Verdict).
- [x] Integrate 3-stage simulation bar into `App.jsx` (Active Debate ↔ Jury Deliberation ↔ Verdict Reveal).
