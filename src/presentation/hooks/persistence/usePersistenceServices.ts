/**
 * Hook para gestión de servicios de persistencia
 * Paso 2 de la modularización gradual - Servicios de persistencia seguros
 */
import { useMemo, useCallback } from 'react';
import { PositionPersistenceService } from '../../../infrastructure/services/PositionPersistenceService';
import { ViewportPersistenceService } from '../../../infrastructure/services/ViewportPersistenceService';
import { Position } from '../../../domain/value-objects/Position';

export const usePersistenceServices = () => {
  // Servicios de persistencia (memoizados para evitar recreaciones)
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);
  const viewportPersistence = useMemo(() => new ViewportPersistenceService(), []);

  // ===== FUNCIONES DE POSICIÓN =====
  
  const loadFlowPositions = useCallback((flowId: string) => {
    return positionPersistence.loadFlowPositions(flowId);
  }, [positionPersistence]);

  const updateNodePosition = useCallback((flowId: string, nodeId: string, position: { x: number; y: number }) => {
    const domainPosition = new Position(position.x, position.y);
    return positionPersistence.updateNodePosition(flowId, nodeId, domainPosition);
  }, [positionPersistence]);

  const removeNodePosition = useCallback((flowId: string, nodeId: string) => {
    return positionPersistence.removeNodePosition(flowId, nodeId);
  }, [positionPersistence]);

  const saveFlowPositions = useCallback((flowId: string, positions: Map<string, { x: number; y: number }>) => {
    // Convertir a objetos Position
    const domainPositions = new Map<string, Position>();
    positions.forEach((pos, id) => {
      domainPositions.set(id, new Position(pos.x, pos.y));
    });
    return positionPersistence.saveFlowPositions(flowId, domainPositions);
  }, [positionPersistence]);

  const clearFlowPositions = useCallback((flowId: string) => {
    return positionPersistence.clearFlowPositions(flowId);
  }, [positionPersistence]);

  const getPositionStats = useCallback(() => {
    return positionPersistence.getStats();
  }, [positionPersistence]);

  // ===== FUNCIONES DE VIEWPORT =====

  const loadFlowViewport = useCallback((flowId: string) => {
    return viewportPersistence.loadFlowViewport(flowId);
  }, [viewportPersistence]);

  const saveFlowViewport = useCallback((flowId: string, viewport: { x: number; y: number; zoom: number }) => {
    return viewportPersistence.saveFlowViewport(flowId, viewport);
  }, [viewportPersistence]);

  const clearFlowViewports = useCallback((flowId: string) => {
    return viewportPersistence.clearFlowViewports(flowId);
  }, [viewportPersistence]);

  const getViewportStats = useCallback(() => {
    return viewportPersistence.getStats();
  }, [viewportPersistence]);

  return {
    // Servicios directos (para compatibilidad con código existente)
    positionPersistence,
    viewportPersistence,
    
    // Funciones encapsuladas
    position: {
      load: loadFlowPositions,
      update: updateNodePosition,
      remove: removeNodePosition,
      save: saveFlowPositions,
      clear: clearFlowPositions,
      getStats: getPositionStats
    },
    viewport: {
      load: loadFlowViewport,
      save: saveFlowViewport,
      clear: clearFlowViewports,
      getStats: getViewportStats
    }
  };
};
