import { useState } from 'react';

export interface RenderMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memoryUsage: number; // MB
  renderTime: number; // ms
}

// Default metrics values with some reasonable placeholder values
const defaultMetrics: RenderMetrics = {
  fps: 60,
  drawCalls: 100,
  triangles: 10000,
  geometries: 50,
  textures: 20,
  memoryUsage: 100,
  renderTime: 8,
};

// Simple hook to provide placeholder metrics until we can implement real ones
export const useRenderMetrics = (): RenderMetrics => {
  const [metrics] = useState<RenderMetrics>(defaultMetrics);
  
  return metrics;
};

export default useRenderMetrics;