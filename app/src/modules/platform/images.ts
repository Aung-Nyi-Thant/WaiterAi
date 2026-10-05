// Uploads are accepted by what the file really is, not by the type the browser claims (SRS: JPG, PNG, WebP, under 8 MB).
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// The file extension for a real JPEG / PNG / WebP, judged from the first bytes; null for anything else.
export function sniffImage(buf: Uint8Array): "jpg" | "png" | "webp" | null {
  const is = (at: number, bytes: number[]) => bytes.every((b, i) => buf[at + i] === b);
  if (is(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (is(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (is(0, [0x52, 0x49, 0x46, 0x46]) && is(8, [0x57, 0x45, 0x42, 0x50])) return "webp";   // "RIFF" .... "WEBP"
  return null;
}
