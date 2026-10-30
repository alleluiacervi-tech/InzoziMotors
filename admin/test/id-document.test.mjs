import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Use the project's compiler so this also runs under the repository's Node 20.
const source = await readFile(new URL('../src/lib/id-document.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
})
const { idDocumentHref } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('an expired signed document URL opens through the live admin session', () => {
  assert.equal(
    idDocumentHref('https://api.sawacars.com/id-verification/doc/id-front.png?sig=expired'),
    '/api/backend/id-verification/doc/id-front.png',
  )
  assert.equal(idDocumentHref('/id-verification/doc/selfie.png'), '/api/backend/id-verification/doc/selfie.png')
})

test('document filenames are safely decoded and encoded once', () => {
  assert.equal(idDocumentHref('/id-verification/doc/id%20front.png?sig=old'), '/api/backend/id-verification/doc/id%20front.png')
})

test('unrelated, malformed, and traversal paths cannot become proxy requests', () => {
  for (const url of ['/admin/users', '/id-verification/doc/a/b', '/id-verification/doc/%2Fetc', '/id-verification/doc/%5Cetc', '/id-verification/doc/%00', '/id-verification/doc/%GG', '/id-verification/doc/..', 'https://[']) {
    assert.equal(idDocumentHref(url), null, url)
  }
})
