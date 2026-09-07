// One-off generator: reads public/SCAM-SHIELD-lOGO-ICON.png and writes every
// derived icon size for the web app, the Firefox extension, and the Android
// app. Run manually with `node scripts/generate-icons.mjs` whenever the
// source logo changes — this is not part of the build.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const SOURCE = join(ROOT, "public", "SCAM-SHIELD-lOGO-ICON.png");

// Navy pulled from the logo itself, used as the adaptive-icon background.
const ADAPTIVE_BG = "#12213b";

async function writeResized(destPath, size) {
  await mkdir(dirname(destPath), { recursive: true });
  await sharp(SOURCE).resize(size, size).png().toFile(destPath);
}

// Adaptive icon foreground: logo scaled down and centered on a transparent
// canvas so it isn't cropped by circular/squircle masks (Android's safe
// zone is the inner ~66% of the 108dp canvas).
async function writeAdaptiveForeground(destPath, canvasSize) {
  const logoSize = Math.round(canvasSize * 0.66);
  await mkdir(dirname(destPath), { recursive: true });
  const logo = await sharp(SOURCE).resize(logoSize, logoSize).toBuffer();
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(destPath);
}

// Notification icon: Android requires a pure white silhouette on a
// transparent background. Derive one from the source by keeping alpha and
// flattening every opaque pixel to white.
async function writeNotificationIcon(destPath, size) {
  await mkdir(dirname(destPath), { recursive: true });
  const { data, info } = await sharp(SOURCE)
    .resize(size, size)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    data[i] = 255; // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    // alpha (data[i + 3]) is left as-is
  }

  await sharp(data, { raw: info }).png().toFile(destPath);
}

async function main() {
  // --- Web app (Next.js icon convention) ---
  await writeResized(join(ROOT, "app", "icon.png"), 512);
  await writeResized(join(ROOT, "app", "apple-icon.png"), 180);

  // --- Firefox extension ---
  const extIcons = join(ROOT, "firefox-extension", "icons");
  await writeResized(join(extIcons, "icon-48.png"), 48);
  await writeResized(join(extIcons, "icon-96.png"), 96);
  await writeResized(join(extIcons, "icon-128.png"), 128);

  // --- Android launcher icon (legacy square/round mipmaps) ---
  const res = join(ROOT, "mobile-app", "app", "src", "main", "res");
  const legacyDensities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(legacyDensities)) {
    await writeResized(join(res, `mipmap-${density}`, "ic_launcher.png"), size);
    await writeResized(join(res, `mipmap-${density}`, "ic_launcher_round.png"), size);
  }

  // --- Android adaptive icon foreground (API 26+) ---
  const adaptiveDensities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [density, size] of Object.entries(adaptiveDensities)) {
    await writeAdaptiveForeground(join(res, `mipmap-${density}`, "ic_launcher_foreground.png"), size);
  }

  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  await mkdir(join(res, "mipmap-anydpi-v26"), { recursive: true });
  await writeFile(join(res, "mipmap-anydpi-v26", "ic_launcher.xml"), adaptiveXml);
  await writeFile(join(res, "mipmap-anydpi-v26", "ic_launcher_round.xml"), adaptiveXml);

  await mkdir(join(res, "values"), { recursive: true });
  await writeFile(
    join(res, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${ADAPTIVE_BG}</color>
</resources>
`
  );

  // --- Android notification icon (white silhouette, 24dp) ---
  const notifDensities = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
  for (const [density, size] of Object.entries(notifDensities)) {
    await writeNotificationIcon(join(res, `drawable-${density}`, "ic_stat_scam_shield.png"), size);
  }

  console.log("Icons generated from", SOURCE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
