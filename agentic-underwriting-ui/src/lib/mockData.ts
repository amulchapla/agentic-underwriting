export type CaseItem = {
  id: string;
  name: string;
  status: "Pending" | "Needs Review" | "AI Approved";
  color: string;
  submissionDate: Date;
  riskFlags: string[];
};

export const submissionQueue: CaseItem[] = [
  { id: "C-123", name: "Case C-123 – 123 Maple St, Springfield, TX", status: "Pending", color: "bg-yellow-100 text-yellow-800", submissionDate: new Date("2025-09-01"), riskFlags: [] },
  { id: "C-456", name: "Case C-456 – 456 Oak Ave, Austin, TX", status: "Needs Review", color: "bg-red-100 text-red-800", submissionDate: new Date("2025-08-30"), riskFlags: ["Prior Claims"] },
  { id: "C-789", name: "Case C-789 – 789 Pine Rd, Dallas, TX", status: "Pending", color: "bg-yellow-100 text-yellow-800", submissionDate: new Date("2025-08-25"), riskFlags: ["Flood Zone"] },
];

export const aiApprovedQueue: CaseItem[] = [
  { id: "C-321", name: "Case C-321 – Auto-Bind", status: "AI Approved", color: "bg-green-100 text-green-800", submissionDate: new Date(), riskFlags: [] },
  { id: "C-654", name: "Case C-654 – Auto-Bind", status: "AI Approved", color: "bg-green-100 text-green-800", submissionDate: new Date(), riskFlags: [] },
];

// per-case chat seed
export const initialMessages: Record<string, { from: "ai" | "user"; text: string }[]> = {
  "C-123": [{ from: "ai", text: "Case loaded. Ask me anything about Case C-123." }],
};
