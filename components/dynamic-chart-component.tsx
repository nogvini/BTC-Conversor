"use client";

import { ReactNode } from "react";

interface DynamicChartComponentProps {
  children: ReactNode;
}

export default function DynamicChartComponent({ children }: DynamicChartComponentProps) {
  return <>{children}</>;
} 