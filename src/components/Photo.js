// ─────────────────────────────────────────────────────────────────────────────
// One way to draw a photograph.
//
// React Native's Image has no disk cache. It keeps decoded bitmaps in memory
// for a while and re-downloads from the network after that, so scrolling a feed
// twice cost twice the data — and with `cache-control: max-age=0` on /uploads
// it re-downloaded even when the bytes had not changed. Both halves of that are
// fixed now: the server sends a year of cache life, and expo-image keeps the
// file on disk, so the second look at a car costs nothing.
//
// What this adds beyond caching:
//
//   • the right SIZE is requested, via utils/photo — a 400-point card asks for
//     ?w=400 and gets 20 KB instead of 488 KB;
//   • a placeholder, so a card is a soft grey block that becomes a car rather
//     than a white hole that pops;
//   • a short crossfade, for the same reason.
//
// It deliberately accepts the props the codebase already uses — `source`,
// `style`, `resizeMode` — and maps them, so converting a call site is a rename
// and not a rewrite. expo-image calls it `contentFit`; both spellings work here.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { Image } from 'expo-image';
import { photoUrl } from '../utils/photo';

// A neutral warm-grey blur. Not a fake photograph — just a shape in roughly the
// brand's temperature, so the wait reads as loading rather than as broken.
const PLACEHOLDER = { blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' };

export default function Photo({
  uri,
  width,
  source,
  style,
  resizeMode,
  contentFit,
  transition = 180,
  placeholder = PLACEHOLDER,
  recyclingKey,
  priority,
  ...rest
}) {
  // Three ways a caller can name the image, because all three already exist in
  // this codebase: a bare uri, a {uri} object, or a local require().
  const resolved = uri !== undefined
    ? { uri: photoUrl(uri, width) }
    : (source && typeof source === 'object' && source.uri
      ? { ...source, uri: photoUrl(source.uri, width) }
      : source);

  return (
    <Image
      source={resolved}
      style={style}
      contentFit={contentFit || resizeMode || 'cover'}
      transition={transition}
      placeholder={placeholder}
      // memory-disk is the point of the whole exercise: a photo seen once is
      // not fetched again, across app launches.
      cachePolicy="memory-disk"
      priority={priority}
      // In a recycled list row, this tells expo-image the view is now showing a
      // different photo, so it clears rather than briefly showing the previous
      // car's picture.
      recyclingKey={recyclingKey || (typeof resolved === 'object' ? resolved.uri : undefined)}
      {...rest}
    />
  );
}
