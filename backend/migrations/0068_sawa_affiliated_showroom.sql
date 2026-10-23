-- ─────────────────────────────────────────────────────────────────────────────
-- 0068_sawa_affiliated_showroom.sql
--
-- A SHOWROOM OWNED BY THE COMPANY THAT RUNS SAWA CARS
--
-- Sawa Cars is not a party to any deal (CLAUDE.md). Its own stock is therefore
-- sold by a separate selling company, listed like any other showroom, and that
-- relationship is disclosed wherever its cars appear: on its storefront and on
-- every one of its listings, including that Sawa Cars inspected them. Set only
-- by the team; it changes no rule, ranking or eligibility.
--
-- This column was first added by editing 0066 after production had already
-- applied it, which the migrator rightly refuses ("edited after being
-- applied"), and every deploy from 21 Oct 2026 stopped there. 0066 is back to
-- exactly what production ran; the column lives here. IF NOT EXISTS keeps it
-- harmless on a database that applied the edited 0066.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS sawa_affiliated BOOLEAN NOT NULL DEFAULT FALSE;
