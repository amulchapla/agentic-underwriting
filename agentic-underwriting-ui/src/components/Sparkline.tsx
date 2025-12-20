"use client";
import React from "react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";

type Props = {
  data: number[];          // e.g., [12,14,9,18,16,20,22]
  height?: number;         // default 40
  strokeWidth?: number;    // default 2
};

export default function Sparkline({ data, height = 40, strokeWidth = 2 }: Props) {
  const series = data.map((v, i) => ({ x: i, y: v }));
  const tooltipFormatter: TooltipProps<number, string>["formatter"] = (
    value: number | string,
  ) => [`${value}`, "Value"];
  return (
    <div className="w-full h-[40px]">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <Tooltip formatter={tooltipFormatter} labelFormatter={() => ""} cursor={false}/>
          <Line type="monotone" dataKey="y" dot={false} strokeWidth={strokeWidth} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
