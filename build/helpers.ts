export async function bundleFile(path: string, bundlePath: string): Promise<void> {
  const bundleProcess = Deno.run({
    cmd: ["deno", "bundle", "--unstable", path],
    stdout: "piped",
  });

  const file = await Deno.open(bundlePath, { create: true, write: true });
  try {
    await Deno.copy(bundleProcess.stdout, file);
  } finally {
    Deno.close(file.rid);
    Deno.close(bundleProcess.rid);
  }
}
