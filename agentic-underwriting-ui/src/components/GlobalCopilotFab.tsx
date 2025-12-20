"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import CopilotDrawer from "@/components/CopilotDrawer";
import { sendCopilotMessage } from "@/lib/api";
import type { KnowledgeCitation } from "@/lib/apiTypes";

type Msg = { 
  from: "ai" | "user"; 
  text: string;
  citations?: KnowledgeCitation[];
};

const seed: Msg[] = [{ from: "ai", text: "Hi! Ask me about your book of business." }];

export default function GlobalCopilotFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((m) => [...m, { from: "user" as const, text: userMessage }]);
    setInput("");
    setIsSending(true);
    try {
      const response = await sendCopilotMessage(userMessage);
      setMessages((m) => [...m, { 
        from: "ai" as const, 
        text: response.answer,
        citations: response.knowledgeCitations 
      }]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Unable to reach copilot.";
      setMessages((m) => [...m, { from: "ai" as const, text: `Copilot error: ${fallback}` }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button size="lg" onClick={() => setOpen(true)}>Copilot Chat</Button>
      </div>
      <CopilotDrawer
        open={open}
        onClose={() => setOpen(false)}
        messages={messages}
        input={input}
        onInput={setInput}
        onSend={send}
        caseName="All Cases"
        isSending={isSending}
      />
    </>
  );
}
