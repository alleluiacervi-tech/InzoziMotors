-- One list of vehicle brands, with a place to put a logo.
--
-- Until now the brands a seller could choose from lived in a 20-item array in
-- src/screens/CarSubmissionScreen.js, copied verbatim into
-- src/screens/CarValuationScreen.js. Two problems, and the second is live:
--
--   1. Changing the list needed a release. Rwanda's fleet is not static — the
--      Chinese brands arriving now were not here three years ago — so a list in
--      a bundle is wrong by construction and gets worse with time.
--
--   2. That list contained no Chinese brand at all, while live inventory
--      already holds Dongfeng, BYD and Denza. A seller with a BYD had to pick
--      the nearest wrong answer or type it in free text, and at least one did:
--      the BYD Qin Plus in the catalogue is recorded with make 'Hyundai', in a
--      banner slot, with a description that says BYD in its first sentence.
--
-- ── Aliases are the point ────────────────────────────────────────────────────
-- People write "Mercedes", "Mercedes-Benz", "Benz" and "VW" for two companies.
-- Without a canonical spelling, filtering by make silently splits one brand's
-- stock across several buckets and each one looks emptier than it is. `aliases`
-- is what lets a lookup collapse them onto one row.
--
-- ── logo_url is nullable, and that is the normal state ───────────────────────
-- No brand marks are committed to this repository. They are third-party
-- trademarks, and a build that bundles fifty of them is a build that ships
-- somebody else's assets to two app stores. An operator uploads what the
-- business is entitled to use, once, from the admin console; everything that
-- renders a brand falls back to a lettermark until then, so the interface is
-- complete on day one and gets richer without a release.
CREATE TABLE IF NOT EXISTS vehicle_makes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  -- Lower-case, punctuation-free. The join key, and what a URL carries.
  slug          TEXT NOT NULL UNIQUE,
  -- Other spellings that mean this brand. Lower-cased on write by the route.
  aliases       TEXT[] NOT NULL DEFAULT '{}',
  logo_url      TEXT,
  -- Lower sorts first. Seeded so the brands actually sold here lead the list
  -- rather than the alphabet deciding a seller scrolls past Toyota.
  display_order INT NOT NULL DEFAULT 500,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_makes_name_check CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  CONSTRAINT vehicle_makes_slug_check CHECK (slug ~ '^[a-z0-9-]{1,60}$'),
  CONSTRAINT vehicle_makes_order_check CHECK (display_order BETWEEN 0 AND 9999)
);

-- Two brands may not share a display name in different letter case.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_makes_name ON vehicle_makes (lower(name));
CREATE INDEX IF NOT EXISTS idx_vehicle_makes_active ON vehicle_makes (display_order, name) WHERE active;

-- ── The seed ─────────────────────────────────────────────────────────────────
-- Ordered by what Rwanda's roads actually carry, not by importance elsewhere.
-- Band 10-99 is the everyday fleet — the Toyotas, the pickups, the minibuses.
-- Band 100-199 is Korean and European, common but second. Band 200-299 is the
-- Chinese wave now arriving, which the old list omitted entirely. Band 300-399
-- is commercial and heavy. Band 400+ is present but rare.
--
-- ON CONFLICT DO NOTHING throughout: this migration must be re-runnable, and it
-- must never overwrite a logo an operator has already uploaded.
INSERT INTO vehicle_makes (name, slug, aliases, display_order) VALUES
  -- The everyday fleet
  ('Toyota',        'toyota',       '{}',                                10),
  ('Nissan',        'nissan',       '{"datsun"}',                        20),
  ('Mitsubishi',    'mitsubishi',   '{"mitsubishi motors"}',             30),
  ('Suzuki',        'suzuki',       '{"maruti","maruti suzuki"}',        40),
  ('Isuzu',         'isuzu',        '{}',                                50),
  ('Honda',         'honda',        '{}',                                60),
  ('Mazda',         'mazda',        '{}',                                70),
  ('Subaru',        'subaru',       '{}',                                80),
  ('Daihatsu',      'daihatsu',     '{}',                                90),
  ('Lexus',         'lexus',        '{}',                                95),
  -- Korean and European
  ('Hyundai',       'hyundai',      '{}',                               100),
  ('Kia',           'kia',          '{"kia motors"}',                   105),
  ('Toyota Hino',   'hino',         '{"hino","hino motors"}',           110),
  ('Volkswagen',    'volkswagen',   '{"vw"}',                           115),
  ('Mercedes-Benz', 'mercedes-benz','{"mercedes","benz","mercedes benz"}', 120),
  ('BMW',           'bmw',          '{}',                               125),
  ('Audi',          'audi',         '{}',                               130),
  ('Land Rover',    'land-rover',   '{"landrover","range rover","rangerover"}', 135),
  ('Ford',          'ford',         '{}',                               140),
  ('Jeep',          'jeep',         '{}',                               145),
  ('Peugeot',       'peugeot',      '{}',                               150),
  ('Renault',       'renault',      '{}',                               155),
  ('Volvo',         'volvo',        '{}',                               160),
  ('Opel',          'opel',         '{}',                               165),
  ('Citroën',       'citroen',      '{"citroen"}',                      170),
  ('Fiat',          'fiat',         '{}',                               175),
  ('Škoda',         'skoda',        '{"skoda"}',                        180),
  ('SEAT',          'seat',         '{}',                               185),
  ('SsangYong',     'ssangyong',    '{"kg mobility","ssang yong"}',     190),
  ('Genesis',       'genesis',      '{}',                               195),
  -- The Chinese wave the old list had none of
  ('BYD',           'byd',          '{"byd auto","build your dreams"}', 200),
  ('Denza',         'denza',        '{}',                               205),
  ('Dongfeng',      'dongfeng',     '{"dfsk","dfm","dong feng"}',       210),
  ('Chery',         'chery',        '{}',                               215),
  ('Geely',         'geely',        '{}',                               220),
  ('Haval',         'haval',        '{}',                               225),
  ('GWM',           'gwm',          '{"great wall","great wall motors"}', 230),
  ('Changan',       'changan',      '{"chang an"}',                     235),
  ('JAC',           'jac',          '{"jac motors"}',                   240),
  ('MG',            'mg',           '{"morris garages"}',               245),
  ('Foton',         'foton',        '{}',                               250),
  ('Jetour',        'jetour',       '{}',                               255),
  ('Omoda',         'omoda',        '{}',                               260),
  -- Commercial and heavy
  ('Tata',          'tata',         '{"tata motors"}',                  300),
  ('Mahindra',      'mahindra',     '{"mahindra & mahindra"}',          305),
  ('Sinotruk',      'sinotruk',     '{"howo","sino truk"}',             310),
  ('Scania',        'scania',       '{}',                               315),
  ('MAN',           'man',          '{"man truck"}',                    320),
  ('Iveco',         'iveco',        '{}',                               325),
  ('Fuso',          'fuso',         '{"mitsubishi fuso","canter"}',     330),
  ('UD Trucks',     'ud-trucks',    '{"ud","nissan diesel"}',           335),
  ('Freightliner',  'freightliner', '{}',                               340),
  -- Present, but rare
  ('Tesla',         'tesla',        '{}',                               400),
  ('Porsche',       'porsche',      '{}',                               405),
  ('Chevrolet',     'chevrolet',    '{"chevy"}',                        410),
  ('GMC',           'gmc',          '{}',                               415),
  ('Dodge',         'dodge',        '{"ram"}',                          420),
  ('Cadillac',      'cadillac',     '{}',                               425),
  ('Mini',          'mini',         '{"mini cooper"}',                  430),
  ('Jaguar',        'jaguar',       '{}',                               435),
  ('Alfa Romeo',    'alfa-romeo',   '{"alfa"}',                         440),
  ('Bentley',       'bentley',      '{}',                               445)
ON CONFLICT (slug) DO NOTHING;
