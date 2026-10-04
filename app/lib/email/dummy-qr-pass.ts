import "server-only";

import QRCode from "qrcode";

export const QR_TICKET_PASS_MARKER = "QR_TICKET_PASS";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function renderQrCells(ticket: string): string {
  const qr = QRCode.create(ticket, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const cells = qr.modules.data;

  return Array.from({ length: size }, (_, row) =>
    `<tr>${Array.from({ length: size }, (_, column) => `<td width="3" height="3" bgcolor="${cells[row * size + column] ? "#12333a" : "#ffffff"}"></td>`).join("")}</tr>`,
  ).join("");
}

export function renderQrTicketPass({
  ticket,
  attendeeName,
  studentId,
  eventName,
}: {
  ticket: string;
  attendeeName: string;
  studentId: string;
  eventName: string;
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border:1px solid #cfe0e0;border-radius:12px;border-collapse:separate;overflow:hidden"><tr><td style="padding:16px 18px;border-right:1px dashed #cfe0e0" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#12333a">UMak SIC Pass</td></tr><tr><td style="padding-top:2px;font-family:Arial,sans-serif;font-size:11px;color:#607579">${escapeHtml(eventName)}</td></tr><tr><td style="padding-top:18px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:#607579">ATTENDEE NAME</td></tr><tr><td style="padding-top:3px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#12333a">${escapeHtml(attendeeName)}</td></tr><tr><td style="padding-top:12px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:#607579">STUDENT ID NUMBER</td></tr><tr><td style="padding-top:3px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#12333a">${escapeHtml(studentId)}</td></tr><tr><td style="padding-top:18px;font-family:Arial,sans-serif;font-size:10px;color:#607579">Present this pass at check-in.</td></tr></table></td><td width="260" align="center" valign="middle" style="padding:12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" aria-label="Check-in QR pass" style="border:1px solid #cfe0e0;border-radius:9px;padding:10px"><tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0">${renderQrCells(ticket)}</table></td></tr></table><div style="padding-top:8px;font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:1px;color:#087f8c">CHECK-IN PASS</div></td></tr></table>`;
}

export function insertQrTicketPass(html: string, pass: string): string {
  const marker = `<p>${QR_TICKET_PASS_MARKER}</p>`;
  return html.includes(marker) ? html.replace(marker, pass) : `${html}<br><br>${pass}`;
}

// Practice sends intentionally use an unsigned payload, so the QR can exercise
// email layout without granting a check-in pass.
export const DUMMY_QR_PASS_HTML = renderQrTicketPass({
  ticket: "practice-email-layout-only",
  attendeeName: "Practice recipient",
  studentId: "PRACTICE-ONLY",
  eventName: "Practice email",
});
