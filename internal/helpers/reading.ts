/**
 * Reads lines from an array of buffers.
 * @param readers an array of reads
 * @param fn a callback for receiving the lines
 */
export async function readLines(readers: (Deno.Reader & Deno.Closer)[], fn: (line: string) => void) {
    readers = [...readers];
    let lineBuffer = '';

    const buf = new Uint8Array(1024);

    while (true) {
        const [n, reader] = await Promise.race(readers.map(r => r.read(buf).then(n => [n, r] as [number, Deno.Reader & Deno.Closer])));

        if (n != null && n > 0) {
            const readStr = new TextDecoder().decode(buf.subarray(0, n));
            const lineBreak = readStr.indexOf('\n');

            if (lineBreak != -1) {
                lineBuffer += readStr.substr(0, lineBreak);
                if (lineBuffer.length > 0) {
                    fn(lineBuffer);
                }
                lineBuffer = readStr.substr(lineBreak + 1);
            }
            else {
                lineBuffer += readStr;
            }
        }
        else if (n == null) {
            if (lineBuffer.length > 0) {
                fn(lineBuffer);
            }

            readers = readers.filter(r => r != reader);
            reader.close();
            if (readers.length == 0) {
                return;
            }
        }
    }
}