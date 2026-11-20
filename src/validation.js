import { z } from 'zod';
export const marksSchema = z.array(z.object({ subject: z.string().regex(/^[A-Z0-9_-]{1,32}$/), score: z.number().int().min(0).max(100).refine(n => !Object.is(n, -0), 'Negative zero is not canonical'), max: z.literal(100) }).strict()).min(1).max(30).refine(items => new Set(items.map(x => x.subject)).size === items.length, 'Duplicate subject');
export const normalizedMarks = marks => marksSchema.parse(marks).sort((a,b) => a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0);
export const publishSchema = z.object({ studentId: z.uuid(), examId: z.uuid(), marks: marksSchema }).strict();
export const proposalSchema = z.object({ baseVersion: z.number().int().positive(), marks: marksSchema, reason: z.string().trim().min(5).max(1000) }).strict();
export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(256) }).strict();
export const approvalSchema = z.object({ signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/) }).strict();
