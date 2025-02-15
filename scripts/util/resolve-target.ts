import { existsSync } from "@std/fs";
import { dirname, resolve } from "@std/path";

export function resolveTarget(target: string): string {
  if (existsSync(target)) return target;

  const current = dirname(new URL(import.meta.url).pathname);
  const normalized = resolve(current, "../..", target);
  if (existsSync(normalized)) return normalized;

  throw new Error(`${target} not found...`);
}
