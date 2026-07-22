import { z } from "zod";

const upstreamDraw = z.object({
  issue: z.union([z.string(), z.number()]).transform(String),
  num1: z.number().int().min(0).max(9),
  num2: z.number().int().min(0).max(9),
  num3: z.number().int().min(0).max(9),
  sum: z.number().optional(),
  bigSmall: z.string().optional(),
  oddEven: z.string().optional(),
  openTime: z.string().nullish(),
});

export const upstreamResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    issue: z.union([z.string(), z.number()]).transform(String),
    num1: z.number().int().min(0).max(9),
    num2: z.number().int().min(0).max(9),
    num3: z.number().int().min(0).max(9),
    sum: z.number().optional(),
    bigSmall: z.string().optional(),
    oddEven: z.string().optional(),
    openTime: z.string().nullish(),
    nextOpenTime: z.string().nullish(),
    history: z.array(upstreamDraw).default([]),
  }),
});

export type UpstreamResponse = z.infer<typeof upstreamResponseSchema>;
