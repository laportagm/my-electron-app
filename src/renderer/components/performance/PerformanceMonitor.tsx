import React, { useState, useEffect, memo } from 'react';
import { Activity, Microchip, Cpu, ChevronUp, BarChart2, Zap } from 'lucide-react';
import useRenderMetrics from '@/hooks/useRenderMetrics';

interface PerformanceMonitorProps {
  className?: string;
}

/**
 * A component that displays real-time 3D rendering metrics
 */
const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ className = '' }) => {
  const [expanded, setExpanded] = useState(false);
  const metrics = useRenderMetrics();
  const [isPerformanceWarning, setIsPerformanceWarning] = useState(false);
  
  // Check for performance issues
  useEffect(() => {
    const hasPerformanceProblem = metrics.fps < 30 || metrics.drawCalls > 1000 || metrics.renderTime > 16;
    setIsPerformanceWarning(hasPerformanceProblem);
  }, [metrics]);
  
  // Format a number with commas for thousands
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Calculate a health score from 0-100 based on metrics
  const calculateHealthScore = (): number => {
    // Start with a perfect score
    let score = 100;
    
    // Deduct points for low FPS (below 60)
    if (metrics.fps < 60) {
      score -= (60 - metrics.fps) * 1.5;
    }
    
    // Deduct points for high draw calls (above 200)
    if (metrics.drawCalls > 200) {
      score -= Math.min(30, (metrics.drawCalls - 200) / 50);
    }
    
    // Deduct points for high render time (above 8ms)
    if (metrics.renderTime > 8) {
      score -= Math.min(30, (metrics.renderTime - 8) * 3);
    }
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  };
  
  const healthScore = calculateHealthScore();
  
  // Get color based on health score
  const getHealthColor = (): string => {
    if (healthScore >= 80) return 'text-green-500';
    if (healthScore >= 60) return 'text-yellow-500';
    if (healthScore >= 40) return 'text-orange-500';
    return 'text-red-500';
  };
  
  // Get message based on health score
  const getHealthMessage = (): string => {
    if (healthScore >= 80) return 'Excellent';
    if (healthScore >= 60) return 'Good';
    if (healthScore >= 40) return 'Fair';
    return 'Poor';
  };
  
  return (
    <div className={`absolute right-4 top-4 z-20 ${className}`}>
      <div className={`bg-glass shadow-neumorph rounded-lg overflow-hidden transition-all duration-300 ${
        expanded ? 'w-80' : 'w-auto'
      }`}>
        {/* Header */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-800 dark:text-gray-200"
        >
          <div className="flex items-center">
            <Activity size={16} className={isPerformanceWarning ? 'text-red-500 animate-pulse' : 'text-green-500'} />
            <span className="ml-2">Performance Monitor</span>
            
            {!expanded && (
              <div className="flex items-center ml-3 space-x-2 text-xs">
                <span className="flex items-center">
                  <Zap size={12} className="mr-1" />
                  {metrics.fps} FPS
                </span>
              </div>
            )}
          </div>
          
          <ChevronUp 
            size={16} 
            className={`transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`} 
          />
        </button>
        
        {/* Expanded content */}
        {expanded && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {/* Health score */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Rendering Health
                </span>
                <span className={`text-xs font-medium ${getHealthColor()}`}>
                  {getHealthMessage()} ({healthScore}/100)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    healthScore >= 80 ? 'bg-green-500' : 
                    healthScore >= 60 ? 'bg-yellow-500' : 
                    healthScore >= 40 ? 'bg-orange-500' : 
                    'bg-red-500'
                  }`} 
                  style={{ width: `${healthScore}%` }}
                ></div>
              </div>
            </div>
            
            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* FPS */}
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Zap size={12} className="mr-1" />
                  <span>FPS</span>
                </div>
                <div className={`text-xl font-semibold ${
                  metrics.fps >= 55 ? 'text-green-600 dark:text-green-400' : 
                  metrics.fps >= 30 ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  {metrics.fps}
                </div>
              </div>
              
              {/* Draw Calls */}
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <BarChart2 size={12} className="mr-1" />
                  <span>Draw Calls</span>
                </div>
                <div className={`text-xl font-semibold ${
                  metrics.drawCalls <= 200 ? 'text-green-600 dark:text-green-400' : 
                  metrics.drawCalls <= 500 ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  {formatNumber(metrics.drawCalls)}
                </div>
              </div>
              
              {/* Triangles */}
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="mr-1"
                  >
                    <path d="M3 20h18L12 4z"/>
                  </svg>
                  <span>Triangles</span>
                </div>
                <div className="text-xl font-semibold">
                  {formatNumber(metrics.triangles)}
                </div>
              </div>
              
              {/* Memory */}
              <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Microchip size={12} className="mr-1" />
                  <span>Memory</span>
                </div>
                <div className={`text-xl font-semibold ${
                  metrics.memoryUsage <= 200 ? 'text-green-600 dark:text-green-400' : 
                  metrics.memoryUsage <= 500 ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-red-600 dark:text-red-400'
                }`}>
                  {metrics.memoryUsage > 0 ? `${metrics.memoryUsage} MB` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Additional metrics */}
            <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 grid grid-cols-2 gap-2">
              <div className="flex justify-between">
                <span>Geometries:</span>
                <span className="font-mono">{metrics.geometries}</span>
              </div>
              <div className="flex justify-between">
                <span>Textures:</span>
                <span className="font-mono">{metrics.textures}</span>
              </div>
              <div className="flex justify-between">
                <span>Render Time:</span>
                <span className="font-mono">{metrics.renderTime.toFixed(2)} ms</span>
              </div>
            </div>
            
            {/* Performance tips */}
            {isPerformanceWarning && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Performance Tips:</strong>
                  {metrics.fps < 30 && (
                    <span className="block mt-1">• Low framerate detected. Consider reducing model complexity.</span>
                  )}
                  {metrics.drawCalls > 500 && (
                    <span className="block mt-1">• High draw call count. Try to batch or merge geometries.</span>
                  )}
                  {metrics.renderTime > 16 && (
                    <span className="block mt-1">• High render time. Check for expensive shaders or post-processing effects.</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(PerformanceMonitor);