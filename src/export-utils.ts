import type { BriefOutput, WorkItem } from './types/brief-output';

const CSV_COLUMNS = [
  'issue_key_placeholder',
  'summary',
  'description',
  'acceptance_criteria',
  'labels',
  'depends_on',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAcForExport(item: WorkItem): string {
  return item.acceptanceCriteria
    .map((ac, i) => {
      const prefix = `${i + 1}. `;
      if (ac.status === 'stated' && ac.evidenceQuote) {
        return `${prefix}${ac.text} [brief: "${ac.evidenceQuote}"]`;
      }
      return `${prefix}${ac.text} [TBD]`;
    })
    .join('\n');
}

/** One row per work item — Jira CSV column names vary; these are generic import-friendly fields. */
export function briefOutputToCsv(data: BriefOutput): string {
  const rows: string[][] = [Array.from(CSV_COLUMNS)];
  data.workItems.forEach((item, index) => {
    const key = `PLACEHOLDER-${index + 1}`;
    const summary = item.title;
    const description = [item.description, `type:${item.type}`, `id:${item.id}`]
      .filter(Boolean)
      .join('\n\n');
    const ac = formatAcForExport(item);
    const labels = item.type;
    const dependsOn = item.parentId ?? '';
    rows.push(
      [key, summary, description, ac, labels, dependsOn].map((c) =>
        escapeCsvField(c),
      ),
    );
  });
  return rows.map((r) => r.join(',')).join('\r\n');
}

export function briefOutputToMarkdown(data: BriefOutput): string {
  const parts: string[] = [];
  if (data.summary) {
    parts.push(`# Summary\n\n${data.summary}\n`);
  }
  for (const item of data.workItems) {
    parts.push(`## ${item.title}\n`);
    parts.push(`**Type:** ${item.type}  \n**Id:** \`${item.id}\`  \n**Parent:** ${item.parentId ?? '—'}\n`);
    if (item.description) {
      parts.push(`\n${item.description}\n`);
    }
    if (item.acceptanceCriteria.length) {
      parts.push('\n**Acceptance criteria**\n');
      for (const ac of item.acceptanceCriteria) {
        if (ac.status === 'stated' && ac.evidenceQuote) {
          parts.push(`- ${ac.text} _(brief: "${ac.evidenceQuote}")_\n`);
        } else {
          parts.push(`- ${ac.text} _(TBD)_\n`);
        }
      }
    }
    parts.push('\n');
  }
  if (data.gaps.length) {
    parts.push('## Client clarifications\n');
    for (const g of data.gaps) {
      parts.push(`- ${g}\n`);
    }
  }
  return parts.join('\n');
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
