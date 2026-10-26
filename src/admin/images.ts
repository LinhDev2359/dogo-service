// Thu nhỏ ảnh ngay trên điện thoại trước khi lưu: tối đa 2000px, định dạng WebP (hoặc JPEG nếu máy không hỗ trợ)
export interface NewImage { blob: Blob; ext: 'webp' | 'jpg'; url: string }

export async function prepareImage(file: File, max = 2000): Promise<NewImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    .catch(() => loadViaImg(file));
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let blob = await toBlob(canvas, 'image/webp', 0.85);
  let ext: NewImage['ext'] = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg', 0.85);
    ext = 'jpg';
  }
  if (!blob) throw new Error('Không đọc được ảnh này');
  return { blob, ext, url: URL.createObjectURL(blob) };
}

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>(r => c.toBlob(r, type, q));

function loadViaImg(file: File) {
  return new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('Không đọc được ảnh này'));
    img.src = URL.createObjectURL(file);
  });
}

export async function blobToBase64(blob: Blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
