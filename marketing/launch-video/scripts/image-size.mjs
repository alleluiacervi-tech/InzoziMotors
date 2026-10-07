// Pixel dimensions of a JPEG, PNG or WebP from its header. No dependencies.

export function imageSize(buf) {
  if (buf.length < 30) throw new Error('Image too small to read')

  // PNG: IHDR width/height at bytes 16–23.
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }

  // WebP: RIFF....WEBP then a VP8 / VP8L / VP8X chunk.
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16)
    if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    if (chunk === 'VP8L') {
      const bits = buf.readUInt32LE(21)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
  }

  // JPEG: walk the markers to the first start-of-frame.
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buf[offset + 1]
      const length = buf.readUInt16BE(offset + 2)
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (isFrame) return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5) }
      offset += 2 + length
    }
  }

  throw new Error('Unsupported image format')
}
