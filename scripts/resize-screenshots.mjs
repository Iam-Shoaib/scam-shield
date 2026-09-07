// One-off: resize README screenshots (no ImageMagick available, so this
// replicates the requested `magick -resize WxH` behavior with sharp).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rename } from "node:fs/promises";
import sharp from "sharp";

const ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const DIR = join(ROOT, "docs", "screenshots");

// Windows won't let sharp overwrite a file it just read in the same
// process (file handle contention), so write to a temp path and rename.
async function resizeJpg(name, width, quality) {
  const path = join(DIR, `${name}.jpg`);
  const tmp = `${path}.tmp`;
  await sharp(path).resize({ width }).jpeg({ quality }).toFile(tmp);
  await rename(tmp, path);
}

async function resizePng(name, width) {
  const path = join(DIR, `${name}.png`);
  const tmp = `${path}.tmp`;
  await sharp(path).resize({ width }).png().toFile(tmp);
  await rename(tmp, path);
}

async function main() {
  // desktop screenshots -> 1440px wide
  for (const f of ["landing", "scan-detail", "ledger", "pricing"]) {
    await resizeJpg(f, 1440, 85);
  }
  // extension shots -> 1200px wide
  for (const f of ["extensions-button", "extension-initial-modal", "extension-during-scan", "extension-scan-result"]) {
    await resizePng(f, 1200);
  }
  // phone shots -> 720px wide
  for (const f of ["sms-scan-results", "sms-notification"]) {
    await resizePng(f, 720);
  }
  console.log("Resized screenshots in", DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
