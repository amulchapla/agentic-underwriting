"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AttachmentItem, CaseTabs } from "@/lib/apiTypes";
import FabricRiskAssessment from "@/components/FabricRiskAssessment";
import LocationIntelligence from "@/components/LocationIntelligence";

type Props = {
  tabs?: CaseTabs | null;
  isLoading?: boolean;
  caseId?: string;
};

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, idx) => (
          <li key={idx}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <strong>{formatLabel(k)}:</strong> <span className="text-muted-foreground">{renderValue(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return String(value);
}

function renderRecord(record?: Record<string, unknown> | null) {
  if (!record || Object.keys(record).length === 0) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }
  return (
    <div className="space-y-1 text-sm">
      {Object.entries(record).map(([key, value]) => (
        <div key={key}>
          <strong>{formatLabel(key)}:</strong> <span className="ml-1">{renderValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function DataTabs({ tabs, isLoading, caseId }: Props) {
  const propertyProfile = tabs?.property_profile as Record<string, unknown> | null | undefined;
  const coverage = tabs?.coverage as Record<string, unknown> | null | undefined;
  const riskData = tabs?.risk as ({
    risk?: Record<string, unknown> | null;
    guidelines?: Record<string, unknown> | null;
  } | null | undefined);
  const attachments = tabs?.attachments as ({
    count?: number;
    items?: { name: string; uri: string }[];
  } | null | undefined);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentItem | null>(null);

  const realtimeImages = [
    {
      src: "/sampledata/cases_mock_assets/cases/C-123/maps/flood_overlay.png",
      alt: "Flood hazard overlay",
      caption: "Flood Hazard Overlay",
    },
    {
      src: "/sampledata/cases_mock_assets/cases/C-123/maps/satellite.png",
      alt: "Satellite imagery snapshot",
      caption: "Satellite Imagery Snapshot",
    },
  ];

  useEffect(() => {
    const items = attachments?.items ?? [];
    if (!items.length) {
      setSelectedAttachment(null);
      return;
    }
    setSelectedAttachment((prev) => {
      if (prev && items.some((item) => item.uri === prev.uri)) {
        return prev;
      }
      return items[0];
    });
  }, [attachments?.items]);

  const renderPreview = (attachment: AttachmentItem) => {
    const extension = attachment.name.split(".").pop()?.toLowerCase();
    if (!extension) {
      return (
        <p className="text-sm text-muted-foreground">Preview unavailable.</p>
      );
    }

    if (["pdf"].includes(extension)) {
      return (
        <iframe
          title={attachment.name}
          src={`${attachment.uri}#toolbar=0`}
          className="w-full h-80 border rounded"
        />
      );
    }

    if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
      return (
        <img
          src={attachment.uri}
          alt={attachment.name}
          className="max-h-80 w-full object-contain rounded border"
        />
      );
    }

    return (
      <p className="text-sm text-muted-foreground">
        Inline preview not supported for .{extension} files. Use the link above to open it in a new tab.
      </p>
    );
  };

  return (
    <>
      <h3 className="text-lg font-semibold mb-2">Data &amp; Documents</h3>
      <Tabs defaultValue="property" className="w-full">
        <TabsList>
          <TabsTrigger value="property">Property Profile</TabsTrigger>
          <TabsTrigger value="coverage">Coverage &amp; Policy Details</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="attachments">Attachments &amp; Media</TabsTrigger>
          <TabsTrigger value="realtime">Location Intelligence &amp; Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="property">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading property profile…</p>
          ) : (
            renderRecord(propertyProfile)
          )}
        </TabsContent>

        <TabsContent value="coverage">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading coverage details…</p>
          ) : (
            renderRecord(coverage)
          )}
        </TabsContent>

        <TabsContent value="risk">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading risk assessment…</p>
          ) : (
            <div className="space-y-6">
              {/* Two-column layout for Risk Factors and Guideline Checks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 bg-card">
                  <h4 className="font-semibold mb-3 pb-2 border-b flex items-center gap-2">
                    🏠 Risk Factors
                  </h4>
                  <div className="text-sm">
                    {renderRecord(riskData?.risk ?? null)}
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-card">
                  <h4 className="font-semibold mb-3 pb-2 border-b flex items-center gap-2">
                    ✓ Guideline Checks
                  </h4>
                  <div className="text-sm">
                    {renderRecord(riskData?.guidelines ?? null)}
                  </div>
                </div>
              </div>
              
              {/* Fabric Risk Assessment Analytics */}
              {caseId && (
                <div className="border-t pt-6">
                  <FabricRiskAssessment caseId={caseId} />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attachments">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading attachments…</p>
          ) : attachments?.items && attachments.items.length > 0 ? (
            <div className="space-y-3 text-sm">
              <ul className="space-y-2">
                {attachments.items.map((item) => (
                  <li
                    key={item.uri}
                    className={`flex items-center justify-between gap-3 rounded border px-3 py-2 ${selectedAttachment?.uri === item.uri ? "border-primary bg-primary/5" : "border-border bg-background"}`}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {selectedAttachment?.uri === item.uri && (
                        <p className="text-xs text-muted-foreground">Currently previewing</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAttachment(item)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        View inline
                      </button>
                      <a
                        className="text-primary/80 underline-offset-2 hover:underline"
                        href={item.uri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open tab
                      </a>
                    </div>
                  </li>
                ))}
              </ul>

              {selectedAttachment && (
                <div className="rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div>
                      <h4 className="font-semibold text-sm">{selectedAttachment.name}</h4>
                      <p className="text-xs text-muted-foreground">Inline preview</p>
                    </div>
                    <a
                      className="text-primary underline-offset-2 hover:underline text-xs"
                      href={selectedAttachment.uri}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open full PDF
                    </a>
                  </div>
                  <div className="p-3 bg-background">
                    {renderPreview(selectedAttachment)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attachments available.</p>
          )}
        </TabsContent>

        <TabsContent value="realtime">
          {/* Location Intelligence Section */}
          {caseId && <LocationIntelligence caseId={caseId} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
