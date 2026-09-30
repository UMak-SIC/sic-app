/**
 * Normalizes and formats a manual ticket code (e.g., "sic9f2k7qrm" -> "SIC-9F2K-7QRM").
 */
export function normalizeTicketCode(input: string): string {
  if (!input) return "";
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("SIC") && cleaned.length > 3) {
    const rest = cleaned.slice(3);
    const chunk1 = rest.slice(0, 4);
    const chunk2 = rest.slice(4, 8);
    if (chunk2) return `SIC-${chunk1}-${chunk2}`;
    if (chunk1) return `SIC-${chunk1}`;
    return "SIC";
  }
  return cleaned;
}
