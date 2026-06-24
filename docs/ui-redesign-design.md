# UI/UX Redesign Design Spec — Terminal IWKBU

> **Tanggal**: 2026-06-23 | **Status**: Approved | **Approach**: Foundation-First (4 Fase)

## Keputusan Desain

| Aspek | Keputusan |
|-------|-----------|
| Visi | Hybrid: Gov + Modern |
| Warna | JR Classic — Biru JR (#0055A4) + Gold (#F5A623) + Navy deep (#0A2540) |
| Layout | Collapsible Sidebar + Topbar |
| Login | Fullscreen BG + Glass card |
| Animasi | Hidupkan esensial |
| Mobile | Bottom Navigation Bar |
| Dark Mode | Full fix |
| Font | Plus Jakarta Sans |

## Design Tokens — Color (JR Brand)

Light: `--brand-jr-blue: 210 100% 33%`, `--brand-gold: 38 92% 55%`, `--brand-navy: 213 75% 15%`
Dark: `--brand-jr-blue: 210 100% 48%`, `--brand-gold: 38 95% 60%`, `--brand-navy: 213 80% 8%`

## Execution Plan

FASE 1: Foundation (tokens, cn(), shadcn components, shared components, cleanup)
FASE 2: Shell + Login (sidebar, topbar, bottom nav, glass card)
FASE 3: Page Migration (all role pages)
FASE 4: Polish + UX Fixes + Dark Mode
