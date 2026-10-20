/** Spreadsheet-friendly UTF-8 CSV, including names with accents and multiline text. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    let text = String(value ?? "");
    // Quoting alone does not stop spreadsheet software from executing formulas.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

export function csvAttachment(csv: string, filename: string): Response {
  const safeName = filename.replace(/[\x00-\x1f\x7f"\\/]/g, "_");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safeName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
