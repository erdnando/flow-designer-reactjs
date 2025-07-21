import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from 'reactflow';
import { ViewportPersistenceService } from '../../../infrastructure/services/ViewportPersistenceService';
import { migrationLog } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';

export interface ViewportManagementOptions {
  currentFlowId?: string;
}

export interface ViewportManagementReturn {
  saveCurrentViewport: () => void;
  getViewportStats: () => any;
  clearPersistedViewport: () => void;
  hasPersistedViewport: React.MutableRefObject<boolean>;
}

/**
 * Hook para gestión del viewport (zoom y posición del canvas)
 * Maneja la persistencia y restauración del viewport entre sesiones
 */
export const useViewportManagement = (options: ViewportManagementOptions): ViewportManagementReturn => {
  const { getViewport, setViewport } = useReactFlow();
  const { currentFlowId } = options;
  
  // Servicio de persistencia de viewport
  const viewportPersistence = useRef(new ViewportPersistenceService()).current;
  
  // Referencia para trackear si hay viewport persistido
  const hasPersistedViewport = useRef<boolean>(false);
  
  // Efecto para cargar viewport persistido cuando cambia el flujo
  useEffect(() => {
    if (!currentFlowId) {
      hasPersistedViewport.current = false;
      return;
    }

    migrationLog('VIEWPORT', 'Loading persisted viewport for flow', { flowId: currentFlowId });

    // Cargar viewport persistido cuando se carga un flujo
    const persistedViewport = viewportPersistence.loadFlowViewport(currentFlowId);
    if (persistedViewport) {
      hasPersistedViewport.current = true;
      logger.debug('🔍 Cargando viewport persistido:', persistedViewport);
      
      // Usar un delay para asegurar que ReactFlow esté listo
      setTimeout(() => {
        setViewport(persistedViewport, { duration: 300 });
        logger.debug('✅ Viewport aplicado después del delay');
        migrationLog('VIEWPORT', 'Viewport restored successfully', { viewport: persistedViewport });
      }, 400); // Más tiempo que el onInit (200ms)
    } else {
      hasPersistedViewport.current = false;
      migrationLog('VIEWPORT', 'No persisted viewport found', { flowId: currentFlowId });
    }
  }, [currentFlowId, viewportPersistence, setViewport]);

  // Función para guardar el viewport actual
  const saveCurrentViewport = useCallback(() => {
    if (!currentFlowId) {
      migrationLog('VIEWPORT', 'Cannot save viewport - no current flow');
      return;
    }
    
    const currentViewport = getViewport();
    viewportPersistence.saveFlowViewport(currentFlowId, currentViewport);
    logger.debug('💾 Viewport guardado:', currentViewport);
    migrationLog('VIEWPORT', 'Viewport saved', { flowId: currentFlowId, viewport: currentViewport });
  }, [currentFlowId, getViewport, viewportPersistence]);

  // Función para obtener estadísticas de viewport
  const getViewportStats = useCallback(() => {
    const stats = viewportPersistence.getStats();
    migrationLog('VIEWPORT', 'Getting viewport stats', stats);
    return stats;
  }, [viewportPersistence]);

  // Función para limpiar viewport persistido del flujo actual
  const clearPersistedViewport = useCallback(() => {
    if (!currentFlowId) {
      migrationLog('VIEWPORT', 'Cannot clear viewport - no current flow');
      return;
    }
    
    viewportPersistence.clearFlowViewports(currentFlowId);
    hasPersistedViewport.current = false;
    logger.info('🧹 Viewport persistido limpiado para flujo:', currentFlowId);
    migrationLog('VIEWPORT', 'Viewport cleared', { flowId: currentFlowId });
  }, [currentFlowId, viewportPersistence]);

  return {
    saveCurrentViewport,
    getViewportStats,
    clearPersistedViewport,
    hasPersistedViewport
  };
};
