import * as React from "react";

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__")) return <em key={index}>{part.slice(2, -2)}</em>;

    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} className="text-cyan underline" target="_blank" rel="noreferrer">{link[1]}</a>;

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function renderBlocks(markdown: string, keyPrefix: string): React.ReactNode[] {
  return markdown.split("\n").map((line, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!line.trim()) return <div key={key} className="h-3" />;
    if (line.startsWith("### ")) return <h3 key={key} className="font-display text-base font-bold text-ink">{renderInline(line.slice(4))}</h3>;
    if (line.startsWith("## ")) return <h2 key={key} className="font-display text-lg font-bold text-ink">{renderInline(line.slice(3))}</h2>;
    if (line.startsWith("# ")) return <h1 key={key} className="font-display text-xl font-bold text-ink">{renderInline(line.slice(2))}</h1>;
    if (line.startsWith("- ")) return <div key={key} className="pl-4 before:mr-2 before:content-['•']">{renderInline(line.slice(2))}</div>;

    return <p key={key}>{renderInline(line)}</p>;
  });
}

export function renderEmailMarkdownPreview(markdown: string): React.ReactNode[] {
  return markdown.split(/(<center>[\s\S]*?<\/center>)/gi).flatMap((part, index) => {
    const centered = part.match(/^<center>([\s\S]*?)<\/center>$/i);
    if (centered) return <div key={`center-${index}`} className="text-center">{renderBlocks(centered[1], `center-${index}`)}</div>;

    return renderBlocks(part, `block-${index}`);
  });
}

export function splitPreviewAtQrTicketPass(markdown: string): [string, string, boolean] {
  const [before, ...after] = markdown.split("{{qr_ticket_pass}}");
  return [before, after.join("{{qr_ticket_pass}}"), after.length > 0];
}
