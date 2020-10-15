/**
 * Reads lines from an array of buffers.
 * @param readers an array of reads
 * @param closeAfterUse if true, the readers will be closed after use.
 * @param fn a callback for receiving the tokens (token = either a line or '\n')
 */
export async function readLines(
  readers: (Deno.Reader & Deno.Closer)[],
  closeAfterUse: boolean,
  fn: (token: string) => void,
): Promise<void> {
  readers = [...readers];
  let lineBuffer = "";

  const buf = new Uint8Array(32 * 1024);

  while (readers.length > 0) {
    const [n, reader] = await Promise.race(readers.map((r) => readIntoBuffer(r, buf)));

    if (n !== null && n > 0) {
      let readStr = new TextDecoder().decode(buf.subarray(0, n));
      let lineBreak = readStr.indexOf("\n", 0);

      while (lineBreak !== -1) {
        lineBuffer += readStr.substr(0, lineBreak);
        if (lineBuffer.length > 0) {
          fn(lineBuffer);
        }
        fn("\n");
        lineBuffer = "";
        readStr = readStr.substr(lineBreak + 1);
        lineBreak = readStr.indexOf("\n", 0);
      }

      if (readStr.length > 0) {
        lineBuffer += readStr;
      }
    } else if (n === null) {
      if (lineBuffer.length > 0) {
        fn(lineBuffer);
      }

      readers = readers.filter((r) => r !== reader);
      if (closeAfterUse) {
        reader.close();
      }
    }
  }
}

async function readIntoBuffer<T extends Deno.Reader>(reader: T, buffer: Uint8Array): Promise<[number | null, T]> {
  const n = await reader.read(buffer);
  return [n, reader];
}
