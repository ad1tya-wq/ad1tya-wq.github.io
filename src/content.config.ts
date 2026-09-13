import { PICTO_ICONS } from './lib/picto';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(140),
    /** two or three sentences: how it works and why it matters */
    detail: z.string().max(420),
    stack: z.array(z.string()).min(1),
    repo: z.url(),
    url: z.url().optional(),
    /** Phosphor regular icon name: the particle pictogram for this project */
    icon: z.enum(PICTO_ICONS),
    year: z.string().optional(),
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
    certificate: z.url().optional(),
    order: z.number().int(),
  }),
});

const education = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/education' }),
  schema: z.object({
    degree: z.string(),
    institution: z.string(),
    start: z.string(),
    end: z.string(),
    /** label is what the number is (CGPA, percentage); value is the number as it should read */
    score: z.object({ label: z.string(), value: z.string() }),
    order: z.number().int(),
  }),
});

export const collections = { projects, experience, education };
