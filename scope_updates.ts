import { ScopeFilter } from 'lume/core/scopes.ts';

const cwd = Deno.cwd();
export function makeScopeUpdate(base: string): ScopeFilter[] {
  return _makeScope(`${cwd}/${base}/posts`, base)
}

function _makeScope(path: string, base: string): ScopeFilter[] {
  const result: ScopeFilter[] = [];
  const dirs = Deno.readDirSync(path)
  for (const dir of dirs) {
    if (dir.isFile) continue;
    if (dir.name === "blogs") {
      result.push(..._makeBlogScope(`${path}/blogs`, base));
      continue;
    }

    const regex = new RegExp(`^${path.replace(`${cwd}/${base}`, '')}/${dir.name}/.*\\\.md~?$`);
    result.push((path) => regex.test(path))
  }
  return result;
}

function _makeBlogScope(path: string, base: string): ScopeFilter[] {
  const result: ScopeFilter[] = [];
  const dirs = Deno.readDirSync(path)
  for (const dir of dirs) {
    if (dir.isFile) continue;
    for (let i = 1; i <= 12; i++) {
      const regex = new RegExp(`^${path.replace(`${cwd}/${base}`, '')}/${dir.name}/${i.toString().padStart(2, "0")}.*\\\.md~?$`);
      console.log(regex)
      result.push((path) => regex.test(path))
    }
  }
  return result;
}
