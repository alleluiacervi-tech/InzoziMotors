-- Browser-visible URLs must never contain Docker-only hosts such as api:3000.
-- Repair legacy gallery rows created while production silently fell back to
-- local storage. The upload files remain in the persisted uploads volume; this
-- migration only gives browsers the public address of that same API service.

UPDATE car_photos
SET url = regexp_replace(
  url,
  '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?(?=/uploads/)',
  'https://api.sawacars.com'
)
WHERE url ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/uploads/';

UPDATE cars AS car
SET images = (
  SELECT array_agg(
    CASE
      WHEN image_url ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/uploads/'
        THEN regexp_replace(
          image_url,
          '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?(?=/uploads/)',
          'https://api.sawacars.com'
        )
      ELSE image_url
    END
    ORDER BY ordinal
  ) AS images
  FROM unnest(car.images) WITH ORDINALITY AS current_image(image_url, ordinal)
)
WHERE car.images IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(car.images) AS image_url
    WHERE image_url ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/uploads/'
  );

UPDATE rental_cars AS rental
SET images = (
  SELECT array_agg(
    CASE
      WHEN image_url ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/uploads/'
        THEN regexp_replace(
          image_url,
          '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?(?=/uploads/)',
          'https://api.sawacars.com'
        )
      ELSE image_url
    END
    ORDER BY ordinal
  ) AS images
  FROM unnest(rental.images) WITH ORDINALITY AS current_image(image_url, ordinal)
)
WHERE rental.images IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(rental.images) AS image_url
    WHERE image_url ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/uploads/'
  );

-- KYC URLs are never public, but their admin-only links are reconstructed from
-- these stored values. Canonicalising them removes the same internal-host debt
-- and keeps exports/support tooling honest.
UPDATE users
SET id_front_url = regexp_replace(id_front_url, '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?', 'https://api.sawacars.com'),
    id_back_url = regexp_replace(id_back_url, '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?', 'https://api.sawacars.com'),
    selfie_url = regexp_replace(selfie_url, '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?', 'https://api.sawacars.com')
WHERE COALESCE(id_front_url, '') ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/'
   OR COALESCE(id_back_url, '') ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/'
   OR COALESCE(selfie_url, '') ~ '^https?://(api|localhost|127\.0\.0\.1)(:[0-9]+)?/';
