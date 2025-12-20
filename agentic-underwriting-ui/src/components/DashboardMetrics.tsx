"use client";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DashboardMetrics() {
  // simple placeholders – swap with real metrics/graphs later
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Today</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">5 Submissions</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>AI Auto-Bind</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">40%</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Needs Review</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">3</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Avg Time to Decision</CardTitle></CardHeader>
        <CardContent className="text-3xl font-semibold">3.2m</CardContent>
      </Card>
    </div>
  );
}
