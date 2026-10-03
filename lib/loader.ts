/** A loader is generated only from an admin-supplied public raw Lua URL. */
export function validRawLoaderUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password && !/\s/.test(value);
  } catch {
    return false;
  }
}

export function loaderCommand(rawUrl: string): string {
  return `loadstring(game:HttpGet(${JSON.stringify(rawUrl)}, true))()`;
}