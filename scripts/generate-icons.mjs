import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");
mkdirSync(iconsDir, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1e3a5f";
  ctx.beginPath();
  const r = size * 0.15;
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // Wrench icon (simplified)
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.55;

  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = "round";

  // Handle
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.2);
  ctx.stroke();

  // Wrench head circle
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = size * 0.07;
  ctx.beginPath();
  ctx.arc(cx + s * 0.22, cy - s * 0.22, s * 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // TS text
  ctx.fillStyle = "#bfdbfe";
  ctx.font = `bold ${size * 0.14}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TS", cx - s * 0.08, cy + s * 0.32);

  const buffer = canvas.toBuffer("image/png");
  writeFileSync(join(iconsDir, `icon-${size}.png`), buffer);
  console.log(`Generated icon-${size}.png`);
}
console.log("Done!");
