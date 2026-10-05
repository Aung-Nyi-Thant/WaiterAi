// Tells what an uploaded file really is from its first bytes. A browser's declared type (file.type) is whatever the
// sender wrote, so it is not trusted: an HTML or script file renamed to .png would have the right label but the wrong content.
export type ImageKind = "jpg" | "png" | "webp";
export function sniffImage(b: Uint8Array): ImageKind | null {
  const at = (i: number) => b[i];
  if (b.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => at(i) === v)) return "png";
  if (b.length >= 12 && String.fromCharCode(at(0), at(1), at(2), at(3)) === "RIFF" && String.fromCharCode(at(8), at(9), at(10), at(11)) === "WEBP") return "webp";
  return null;
}
