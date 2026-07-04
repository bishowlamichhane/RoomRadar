// Diagnostic — uploads a tiny generated PNG to your Cloudinary unsigned preset
// and prints Cloudinary's exact error (or the returned URL on success).
// Run: node scripts/test-cloudinary.mjs
import fs from "node:fs";
import path from "node:path";

// Load .env manually (no dotenv dep required)
const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("No .env found in cwd — run from project root.");
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

console.log("cloud_name:   ", JSON.stringify(cloud));
console.log("upload_preset:", JSON.stringify(preset));

if (!cloud || !preset) {
  console.error("Both must be set in .env. Aborting.");
  process.exit(1);
}

// 1x1 red PNG
const pngB64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

const form = new FormData();
form.append("file", "data:image/png;base64," + pngB64);
form.append("upload_preset", preset);

const url = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
console.log("\nPOST", url, "…\n");

const res = await fetch(url, { method: "POST", body: form });
const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}
console.log("HTTP", res.status);
console.log("Body:", JSON.stringify(body, null, 2));

if (res.ok && body?.secure_url) {
  console.log("\n✓ Upload succeeded. URL:", body.secure_url);
} else {
  console.log("\n✗ Upload failed. See body above for Cloudinary's exact reason.");
}
