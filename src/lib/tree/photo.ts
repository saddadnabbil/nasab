export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Berkas harus berupa gambar.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ukuran gambar maksimal 8MB.");
  }

  const bitmap = await loadImage(file);
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kanvas tidak tersedia.");

  const src = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - src) / 2;
  const sy = (bitmap.height - src) / 2;
  ctx.drawImage(bitmap, sx, sy, src, src, 0, 0, size, size);

  const quality = file.size > 1_500_000 ? 0.72 : 0.84;
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak dapat dibaca."));
    };
    img.src = url;
  });
}
