-- Marketplace policy guardrails must not be reversible from the dashboard.
-- Vehicle inspection is part of Sawa's publication promise, just as the
-- no-gateway and no-guarantee policies are part of the direct-deal model.
UPDATE platform_settings
SET value = 'true'::jsonb,
    editable = FALSE,
    description = 'A completed inspection is required before a new sale listing is published.',
    updated_at = NOW(),
    updated_by = NULL
WHERE key = 'inspection_required';
