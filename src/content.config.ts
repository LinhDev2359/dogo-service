import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

export const CATEGORY_KEYS = ['ban-tho', 'hoanh-phi', 'ban-ghe', 'giuong-tu', 'my-nghe'] as const;
export const STATUS_KEYS = ['dat-lam', 'co-san', 'trung-bay'] as const;

// Mỗi sản phẩm là một file Markdown trong src/content/products (sửa qua /admin)
const products = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/products' }),
  schema: ({ image }) => z.object({
    name: z.string(),
    category: z.enum(CATEGORY_KEYS).catch('my-nghe'),
    status: z.enum(STATUS_KEYS).catch('dat-lam'),
    images: z.array(image()).nullish().transform(v => v ?? []),
    material: z.string().nullish(),
    size: z.string().nullish(),
    price: z.string().nullish(),
    banner: z.boolean().default(false),
    featured: z.boolean().default(false),
    visible: z.boolean().default(true),
    order: z.number().nullish(),
  }),
});

// Thông tin chung của cửa hàng: một file JSON duy nhất
const settings = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/settings' }),
  schema: ({ image }) => z.object({
    brand: z.string(),
    tagline: z.string().nullish(),
    intro_title: z.string(),
    intro_text: z.string(),
    story_title: z.string(),
    story_text: z.string(),
    story_image: image().nullish(),
    gallery: z.array(z.object({ image: image().nullish(), caption: z.string().nullish() })).nullish().transform(v => v ?? []),
    phone: z.string(),
    zalo: z.string().nullish(),
    messenger: z.string().nullish(),
    facebook: z.string().nullish(),
    address: z.string(),
    hours: z.string().nullish(),
    maps_url: z.string().nullish(),
    maps_embed: z.string().nullish(),
    form_key: z.string().nullish(),
  }),
});

export const collections = { products, settings };
