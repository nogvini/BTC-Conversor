"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

// Importação dinâmica do Recharts com SSR desabilitado para evitar problemas
const DynamicChartComponent = dynamic(
  () => import('./dynamic-chart-component'),
  { ssr: false }
);

interface ChartWrapperProps {
  children: ReactNode;
}

export default function ChartWrapper({ children }: ChartWrapperProps) {
  return <DynamicChartComponent>{children}</DynamicChartComponent>;
} 