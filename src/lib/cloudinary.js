// Subida de imágenes a Cloudinary mediante unsigned upload preset.
// El cloud name es público (aparece en cada URL de imagen). NUNCA poner aquí
// el API key ni el API secret: este código se sirve al navegador.
const CLOUD_NAME = 'dqgkolooc';
const UPLOAD_PRESET = 'prode_feed'; // preset UNSIGNED creado en la consola de Cloudinary

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export const uploadImage = async (file) => {
  if (!file) throw new Error('No hay archivo.');
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('La imagen supera los 8MB.');

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Cloudinary ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return data.secure_url;
};

// Inserta transformaciones en la URL para servir la imagen optimizada:
// f_auto = formato automático (webp/avif), q_auto = calidad automática,
// c_limit + w = no agranda, solo limita el ancho máximo.
export const optimized = (url, width) => {
  if (!url || !url.includes('/upload/')) return url;
  const t = width ? `f_auto,q_auto,c_limit,w_${width}` : 'f_auto,q_auto';
  return url.replace('/upload/', `/upload/${t}/`);
};
