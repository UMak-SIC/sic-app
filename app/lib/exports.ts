/** Fetch before downloading so session and server failures stay visible in the page. */
export async function downloadExport(url: string, filename: string, ids?: string[]): Promise<void> {
  const response = await fetch(url, ids ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  } : undefined).catch(() => {
    throw new Error("The list could not be exported. Check your connection and try again.");
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Your session has ended. Sign in again to export this list."
      : "The list could not be exported. Try again.");
  }
  const blob = await response.blob().catch(() => {
    throw new Error("The download was interrupted. Check your connection and try again.");
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
