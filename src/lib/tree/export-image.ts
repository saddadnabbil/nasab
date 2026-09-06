function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawWordmark(ctx: CanvasRenderingContext2D, x: number, centerY: number) {
  const s = 22;
  const top = centerY - s / 2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.4;
  const dot = (cx: number, cy: number, r: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(x + 6, top + 6, 3.1);
  dot(x + 16, top + 6, 3.1);
  dot(x + 11, top + 16.2, 3.1);
  ctx.beginPath();
  ctx.moveTo(x + 6, top + 9.2);
  ctx.lineTo(x + 11, top + 13.1);
  ctx.lineTo(x + 16, top + 9.2);
  ctx.stroke();
}

/** Stacks a black Nasab credit bar under an exported tree PNG. */
export async function withNasabCredit(pngDataUrl: string, footerHeight = 64): Promise<string> {
  const img = await loadImage(pngDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height + footerHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return pngDataUrl;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const barY = img.height;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, barY, canvas.width, footerHeight);

  const cy = barY + footerHeight / 2;
  drawWordmark(ctx, 28, cy);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.font = "600 20px Inter, system-ui, sans-serif";
  ctx.fillText("Nasab", 58, cy + 1);

  ctx.font = "400 12px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  const label = "dibuat dengan nasab";
  const labelWidth = ctx.measureText(label).width;
  ctx.fillText(label, canvas.width - labelWidth - 28, cy + 1);

  return canvas.toDataURL("image/png");
}
