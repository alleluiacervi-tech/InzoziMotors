// Static file server for the stage. Rooted at the repository so the film can
// use the app's own fonts (assets/fonts), icon font (node_modules/@expo/vector-icons),
// logo and splash without copying them.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
}

export function serve(port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const file = path.normalize(path.join(REPO, url))
    if (!file.startsWith(REPO)) {
      res.writeHead(403).end()
      return
    }
    fs.readFile(file, (err, body) => {
      if (err) {
        res.writeHead(404).end(`Not found: ${url}`)
        return
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(body)
    })
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })))
}

export const STAGE_PATH = '/marketing/launch-video/src/stage.html'
