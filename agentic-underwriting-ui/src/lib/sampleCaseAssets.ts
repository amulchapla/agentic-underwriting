import type { AttachmentItem, CaseViewModel } from "./apiTypes";

const CASE_DOCUMENTS: Record<string, AttachmentItem[]> = {
  "C-123": [
    {
      name: "Application.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-123/documents/Application.pdf",
    },
    {
      name: "Inspection Report.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-123/documents/InspectionReport.pdf",
    },
    {
      name: "Loss Runs.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-123/documents/LossRuns.pdf",
    },
    {
      name: "Valuation Report.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-123/documents/ValuationReport.pdf",
    },
  ],
  "C-456": [
    {
      name: "Application.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-456/documents/Application.pdf",
    },
    {
      name: "Inspection Report.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-456/documents/InspectionReport.pdf",
    },
    {
      name: "Loss Runs.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-456/documents/LossRuns.pdf",
    },
  ],
  "C-789": [
    {
      name: "Application.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-789/documents/Application.pdf",
    },
    {
      name: "Inspection Report.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-789/documents/InspectionReport.pdf",
    },
  ],
  "C-321": [
    {
      name: "Application.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-321/documents/Application.pdf",
    },
    {
      name: "Inspection Report.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-321/documents/InspectionReport.pdf",
    },
  ],
  "C-654": [
    {
      name: "Application.pdf",
      uri: "/sampledata/cases_mock_assets/cases/C-654/documents/Application.pdf",
    },
  ],
};

export function mergeSampleAttachments(view: CaseViewModel, caseId: string): CaseViewModel {
  const sample = CASE_DOCUMENTS[caseId];
  if (!sample?.length) return view;

  const existingAttachments = view.tabs?.attachments ?? {};

  return {
    ...view,
    tabs: {
      ...view.tabs,
      attachments: {
        ...existingAttachments,
        count: sample.length,
        items: sample,
      },
    },
  };
}

export function getSampleAttachments(caseId: string): AttachmentItem[] {
  return CASE_DOCUMENTS[caseId] ?? [];
}
