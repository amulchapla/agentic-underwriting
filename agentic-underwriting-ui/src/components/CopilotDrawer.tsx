"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import type { KnowledgeCitation } from "@/lib/apiTypes";

type Msg = { 
  from: "ai" | "user"; 
  text: string;
  citations?: KnowledgeCitation[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  messages: Msg[];
  input: string;
  onInput: (v: string) => void;
  onSend: () => Promise<void> | void;
  caseName: string;
  isSending?: boolean;
};

export default function CopilotDrawer({ open, onClose, messages, input, onInput, onSend, caseName, isSending }: Props) {
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      // Find the actual scrollable element inside ScrollArea
      const scrollableElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableElement) {
        scrollableElement.scrollTop = scrollableElement.scrollHeight;
      }
    }
  }, [messages]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl flex flex-col">
        <div className="bg-primary text-primary-foreground px-4 py-3 flex justify-between items-center">
          <h3 className="font-semibold">Underwriting Copilot</h3>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
          <div className="shrink-0">
            <p className="font-semibold mb-1">Agent Action Timeline</p>
            <ol className="relative border-l border-gray-300 ml-2 text-sm">
              <li className="mb-4 ml-4"><div className="absolute w-3 h-3 bg-blue-400 rounded-full -left-1.5 border border-white"></div><span className="font-medium">Prefill</span> – Orchestrator Agent auto-populates property data (09:00 AM)</li>
              <li className="mb-4 ml-4"><div className="absolute w-3 h-3 bg-teal-400 rounded-full -left-1.5 border border-white"></div><span className="font-medium">Fetch</span> – Risk Assessment Agent retrieves hazard and claims data (09:01 AM)</li>
              <li className="mb-4 ml-4"><div className="absolute w-3 h-3 bg-yellow-400 rounded-full -left-1.5 border border-white"></div><span className="font-medium">Evaluate</span> – Risk Assessment Agent scores risk and flags issues (09:02 AM)</li>
              <li className="ml-4"><div className="absolute w-3 h-3 bg-green-400 rounded-full -left-1.5 border border-white"></div><span className="font-medium">Decision</span> – Orchestrator Agent finalizes recommendation (09:03 AM)</li>
            </ol>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <p className="font-semibold mb-1 shrink-0">Copilot Chat ({caseName})</p>
            <ScrollArea
              ref={scrollAreaRef}
              className="flex-1 border rounded p-2 bg-white overflow-y-auto"
              style={{ paddingBottom: "10%" }}
            >
              {messages.map((msg, i) => (
                <div key={i} className={`mb-3 ${msg.from === "user" ? "text-right" : "text-left"}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg ${msg.from === "user" ? "bg-blue-500 text-white" : "bg-gray-200"} max-w-full`}>
                    {msg.from === "ai" ? (
                      <div 
                        className="prose prose-sm max-w-none overflow-y-auto relative"
                        style={{ 
                          maxHeight: "400px",
                          lineHeight: "1.6"
                        }}
                      >
                        <div className="markdown-content">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                              code: ({ children }) => <code className="bg-gray-100 px-1 rounded text-xs">{children}</code>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic my-2">{children}</blockquote>,
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        {/* Fade gradient at bottom when content overflows */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-200 to-transparent pointer-events-none"
                          style={{
                            display: msg.text.length > 500 ? 'block' : 'none'
                          }}
                        />
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                  {msg.from === "ai" && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 inline-block max-w-full">
                      <button
                        onClick={() => setExpandedCitation(expandedCitation === i ? null : i)}
                        className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
                      >
                        {expandedCitation === i ? "▼" : "▶"} 📚 Sources ({msg.citations.length})
                      </button>
                      {expandedCitation === i && (
                        <ul className="mt-1 space-y-1 text-xs text-gray-600 pl-4">
                          {msg.citations.map((citation, citIdx) => (
                            <li key={citIdx} className="flex items-start gap-1">
                              <span className="text-blue-600">•</span>
                              <span>
                                <strong>{citation.manual}</strong>
                                {citation.score > 0 && (
                                  <span className="ml-1 text-gray-500">
                                    (score: {citation.score.toFixed(3)})
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {/* Invisible element at the end for auto-scroll */}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="flex gap-2 mt-2 shrink-0">
              <input
                className="flex-1 border rounded px-2 py-1"
                value={input}
                onChange={(e) => onInput(e.target.value)}
                placeholder={`Ask about ${caseName}…`}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
              />
              <Button onClick={onSend} disabled={isSending}>
                {isSending ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
