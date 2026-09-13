import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(140),
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    url: z.url().optional(),
    order: z.number().int(),
  }),
});

const experience = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/experience' }),
  schema: z.object({
    role: z.string(),
    org: z.string(),
    start: z.string(),
    end: z.string().optional(),
    summary: z.string().max(200),
    order: z.number().int(),
  }),
});

export const collections = { projects, experience };
