// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export async function extractText(buf: Buffer): Promise<string> {
  const data = await pdfParse(buf);
  return data.text ?? "";
}
