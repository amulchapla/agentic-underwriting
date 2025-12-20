"use client";
import React, { useState } from "react";
import type { KnowledgeInsight } from "@/lib/apiTypes";
import { Card } from "@/components/ui/card";

type Props = {
  insights?: KnowledgeInsight[] | null;
  isLoading?: boolean;
};

export default function KnowledgeInsightsCard({ insights, isLoading }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="rounded-t-lg bg-blue-600 px-4 py-2">
          <h3 className="text-white text-base font-bold tracking-wide">
            📚 Knowledge Insights
          </h3>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          Loading regulatory guidance…
        </div>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return null; // Don't render if no insights
  }

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <Card className="overflow-hidden">
      <div className="rounded-t-lg bg-blue-600 px-4 py-2">
        <h3 className="text-white text-base font-bold tracking-wide">
          📚 Knowledge Insights
        </h3>
      </div>
      <div className="p-4 space-y-4">
        {insights.map((insight, index) => {
          const isExpanded = expandedIndex === index;
          const topCitations = insight.citations.slice(0, 2);
          
          return (
            <div
              key={index}
              className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50/50 rounded-r"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-700">
                    {insight.question}
                  </p>
                  {insight.relevanceScore && (
                    <span className="text-xs text-blue-600 font-semibold whitespace-nowrap">
                      Score: {insight.relevanceScore.toFixed(2)}
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-800 leading-relaxed">
                  {insight.answer}
                </div>

                {topCitations.length > 0 && (
                  <div className="pt-2 border-t border-blue-200">
                    <button
                      onClick={() => toggleExpand(index)}
                      className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
                    >
                      {isExpanded ? "▼" : "▶"} Sources ({insight.citations.length})
                    </button>
                    
                    {isExpanded && (
                      <ul className="mt-2 space-y-1 text-xs text-gray-600">
                        {insight.citations.map((citation, citIdx) => (
                          <li key={citIdx} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>
                              <strong>{citation.manual}</strong>
                              {citation.score > 0 && (
                                <span className="ml-2 text-gray-500">
                                  (score: {citation.score.toFixed(3)})
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    
                    {!isExpanded && (
                      <p className="mt-1 text-xs text-gray-500 italic">
                        {topCitations.map((c) => c.manual).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
