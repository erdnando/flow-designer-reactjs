/**
 * Sistema de monitoreo de performance para validar mejoras
 */

import { useCallback, useEffect, useRef } from 'react';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from './logger';

interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage?: number;
  timestamp: number;
}

/**
 * Hook para medir tiempo de renderizado de componentes
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const metrics = useRef<PerformanceMetrics[]>([]);
  
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
    
    // Medir después del render
    const measurePerformance = () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      const metric: PerformanceMetrics = {
        renderTime,
        reRenderCount: renderCount.current,
        timestamp: Date.now()
      };
      
      metrics.current.push(metric);
      
      // Mantener solo las últimas 100 métricas
      if (metrics.current.length > 100) {
        metrics.current.shift();
      }
      
      // Log solo si hay problemas de performance
      if (renderTime > 16) { // 60fps = 16ms por frame
        logger.warn(`⚠️ Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    };
    
    // Usar requestAnimationFrame para medir después del paint
    requestAnimationFrame(measurePerformance);
  });
  
  const getMetrics = useCallback(() => {
    return {
      averageRenderTime: metrics.current.reduce((sum, m) => sum + m.renderTime, 0) / metrics.current.length,
      maxRenderTime: Math.max(...metrics.current.map(m => m.renderTime)),
      totalRenders: renderCount.current,
      recentMetrics: metrics.current.slice(-10)
    };
  }, []);
  
  return { getMetrics };
};

/**
 * Función para comparar performance entre versiones
 */
export const comparePerformance = (baseline: PerformanceMetrics[], current: PerformanceMetrics[]) => {
  const baselineAvg = baseline.reduce((sum, m) => sum + m.renderTime, 0) / baseline.length;
  const currentAvg = current.reduce((sum, m) => sum + m.renderTime, 0) / current.length;
  
  const improvement = ((baselineAvg - currentAvg) / baselineAvg) * 100;
  
  return {
    baselineAverage: baselineAvg,
    currentAverage: currentAvg,
    improvement: improvement,
    isImprovement: improvement > 0
  };
};

/**
 * Hook para detectar memory leaks en desarrollo
 */
export const useMemoryMonitor = () => {
  const memoryRef = useRef<number[]>([]);
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isFeatureEnabled('PERFORMANCE_MONITORING')) {
      const interval = setInterval(() => {
        if ('memory' in performance) {
          // @ts-ignore - performance.memory no está en todos los navegadores
          const memInfo = performance.memory as any;
          memoryRef.current.push(memInfo.usedJSHeapSize);
          
          // Mantener solo las últimas 50 mediciones
          if (memoryRef.current.length > 50) {
            memoryRef.current.shift();
          }
          
          // Detectar posible memory leak
          if (memoryRef.current.length >= 10) {
            const recent = memoryRef.current.slice(-10);
            const trend = recent[recent.length - 1] - recent[0];
            
            if (trend > 1024 * 1024 * 10) { // 10MB de incremento
              logger.warn('🚨 Possible memory leak detected');
            }
          }
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, []);
};
