/** Mirrors backend contract for typed UI rendering. */
export type AcceptanceCriterionStatus = 'stated' | 'tbd';

export interface AcceptanceCriterionItem {
  text: string;
  evidenceQuote?: string | null;
  status: AcceptanceCriterionStatus;
}

export interface WorkItem {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterionItem[];
}

export interface BriefOutput {
  schemaVersion: number;
  summary?: string;
  assumptionsPolicy?: string;
  workItems: WorkItem[];
  gaps: string[];
}
