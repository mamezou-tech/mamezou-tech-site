import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function resolveTarget(target: string): string {
  if (fs.existsSync(target)) return target;

  const current = path.dirname(fileURLToPath(import.meta.url));
  let normalized = path.resolve(current, '../..', target);
  if (fs.existsSync(normalized)) return normalized;

  throw new Error(`${target} not found... `);
}