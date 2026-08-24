const test = require('node:test');
const assert = require('node:assert/strict');

// This worker deliberately has no Cloudinary credentials. It proves the
// persistent-volume fallback remains browser-reachable in every environment.
for (const name of [
  'CLOUDINARY_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
]) delete process.env[name];

const { parseConfiguredOrigin, publicApiOrigin } = require('../src/lib/public-origin');
const { publicUploadUrl, resolveUploadUrl } = require('../src/middleware/upload');

function fakeRequest(host = 'api:3000') {
  return {
    protocol: 'https',
    params: { carId: '00000000-0000-4000-8000-000000000001' },
    headers: {},
    get(name) {
      if (String(name).toLowerCase() === 'host') return host;
      return this.headers[String(name).toLowerCase()];
    },
  };
}

test('configured public origin is canonical and rejects unsafe shapes', () => {
  assert.equal(parseConfiguredOrigin('https://api.sawacars.com/'), 'https://api.sawacars.com');
  assert.throws(() => parseConfiguredOrigin('api.sawacars.com'), /absolute URL/);
  assert.throws(() => parseConfiguredOrigin('https://api.sawacars.com/private'), /must not contain a path/);
  assert.throws(() => parseConfiguredOrigin('file:///tmp/api'), /http or https/);
});

test('public upload URLs never persist the internal Docker hostname when a public origin is configured', () => {
  const previous = process.env.PUBLIC_API_URL;
  process.env.PUBLIC_API_URL = 'https://api.sawacars.com';
  try {
    assert.equal(publicApiOrigin(fakeRequest()), 'https://api.sawacars.com');
    assert.equal(
      publicUploadUrl(fakeRequest(), { filename: 'photo.jpg' }),
      'https://api.sawacars.com/uploads/cars/00000000-0000-4000-8000-000000000001/photo.jpg'
    );
  } finally {
    if (previous === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = previous;
  }
});

test('production uses the canonical persistent-volume fallback when Cloudinary is unavailable', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicUrl = process.env.PUBLIC_API_URL;
  process.env.NODE_ENV = 'production';
  process.env.PUBLIC_API_URL = 'https://api.sawacars.com';
  try {
    assert.equal(
      await resolveUploadUrl(fakeRequest(), { filename: 'photo.jpg', path: 'temporary/photo.jpg' }),
      'https://api.sawacars.com/uploads/cars/00000000-0000-4000-8000-000000000001/photo.jpg'
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = previousPublicUrl;
  }
});

test('development keeps an explicit, browser-reachable local fallback', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPublicUrl = process.env.PUBLIC_API_URL;
  process.env.NODE_ENV = 'development';
  process.env.PUBLIC_API_URL = 'http://localhost:3000';
  try {
    assert.equal(
      await resolveUploadUrl(fakeRequest(), { filename: 'photo.jpg', path: 'temporary/photo.jpg' }),
      'http://localhost:3000/uploads/cars/00000000-0000-4000-8000-000000000001/photo.jpg'
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousPublicUrl === undefined) delete process.env.PUBLIC_API_URL;
    else process.env.PUBLIC_API_URL = previousPublicUrl;
  }
});
