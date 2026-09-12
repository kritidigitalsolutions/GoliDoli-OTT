# GoliDoli OTT - UI Design Rule: Segmented Toggle Control

For all toggle switches, segmented filters, tab selectors, and option group controls across the GoliDoli OTT web application:

1. **Track Container (`.segmented-switch`)**:
   - Must use a single rounded pill-shaped track (`border-radius: 9999px`).
   - Track background: `var(--bg3)` in dark mode, `#f1f5f9` in light mode.
   - Track border: `1px solid var(--border)` in dark mode, `1px solid #cbd5e1` in light mode.
   - Inset padding: `3px`, gap: `2px`.
   - **Never** use individual box borders or outlined table-like grid boxes around each unselected option button.

2. **Button Options (`.segmented-switch-btn`)**:
   - Transparent background when unselected (`background: transparent !important`, `border: none !important`).
   - Muted text color (`#64748b` in light mode, `var(--text-muted)` in dark mode).
   - Smooth hover transition to `#0f172a` (light mode) / `var(--text)` (dark mode).

3. **Active State (`.segmented-switch-active-bg`)**:
   - Use Framer Motion `motion.div layoutId="..."` for smooth spring sliding transition where possible.
   - Active pill background: Brand Gold (`#FFD11A`) with bold black text (`#000000`).
   - Soft glow shadow: `0 2px 6px rgba(255, 209, 26, 0.35)`.
