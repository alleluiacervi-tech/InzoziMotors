-- How fast is too fast for a 150-point inspection?
--
-- started_at and completed_at have always been recorded and never compared to
-- anything. A checklist "completed" in four minutes did not happen, and until
-- now nothing anywhere would say so.
--
-- This is a FLAG, never a block. A mechanic can legitimately start an
-- inspection, be interrupted, and restart it; refusing the completion would
-- punish honest work and teach people to game the clock instead. Making it
-- visible — in the Action Center and permanently in the audit log — is what
-- actually changes behaviour, because it is reviewable by a human who can ask.
--
-- Editable, because the honest floor depends on how the centres actually work
-- and nobody knows that yet. Twenty minutes for 150 points is deliberately
-- generous: it is not a target, it is a line below which the record is not
-- credible.
INSERT INTO platform_settings (key, value, description, editable) VALUES
  ('inspection_min_minutes',
   '20'::jsonb,
   'Below this many minutes, a completed 150-point inspection is flagged for review. A signal for a human, never a refusal.',
   TRUE)
ON CONFLICT (key) DO NOTHING;
