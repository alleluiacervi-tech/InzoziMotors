// Opens the stage in headless Chromium. Shared by stills.mjs and render.mjs.

import { execSync } from 'node:child_process'
import path from 'node:path'
import { serve, STAGE_PATH } from './serve.mjs'

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    // Fall back to a global install (npm i -g playwright).
    const root = execSync('npm root -g').toString().trim()
    return import(path.join(root, 'playwright/index.mjs'))
  }
}

export async function openStage({ pages = 1 } = {}) {
  const { chromium } = await loadPlaywright()
  const { server, port } = await serve()
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] })
  const opened = []
  for (let i = 0; i < pages; i += 1) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto(`http://127.0.0.1:${port}${STAGE_PATH}`)
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 })
    const failure = await page.evaluate(() => window.__error)
    if (failure) throw new Error(`Stage failed to boot:\n${failure}\n${errors.join('\n')}`)
    opened.push(page)
  }
  return {
    pages: opened,
    async close() {
      await browser.close()
      server.close()
    },
  }
}
