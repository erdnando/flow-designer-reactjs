/**
 * Contexto de selección unificado para el sistema de mejoras graduales
 * Permite manejar selección de flow, node y connection de manera consistente
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from '../utils/logger';

export interface UnifiedSelectionState {
  type: 'flow' | 'node' | 'connection' | null;
  elementId: string | null;
  metadata?: {
    timestamp: number;
    previousSelection?: UnifiedSelectionState;
  };
}

interface UnifiedSelectionContextType {
  selection: UnifiedSelectionState;
  selectFlow: (flowId?: string) => void;
  selectNode: (nodeId: string) => void;
  selectConnection: (connectionId: string) => void;
  clearSelection: () => void;
  isSelected: (type: UnifiedSelectionState['type'], elementId: string) => boolean;
  hasSelection: boolean;
}

const UnifiedSelectionContext = createContext<UnifiedSelectionContextType | null>(null);

export const UnifiedSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selection, setSelection] = useState<UnifiedSelectionState>({
    type: null,
    elementId: null
  });

  const selectFlow = useCallback((flowId?: string) => {
    if (!isFeatureEnabled('UNIFIED_SELECTION')) return;
    
    const newSelection: UnifiedSelectionState = {
      type: 'flow',
      elementId: flowId || 'current',
      metadata: {
        timestamp: Date.now(),
        previousSelection: selection.type ? { ...selection } : undefined
      }
    };
    
    setSelection(newSelection);
    logger.debug('🎯 Unified selection: Flow selected', newSelection);
  }, [selection]);

  const selectNode = useCallback((nodeId: string) => {
    if (!isFeatureEnabled('UNIFIED_SELECTION')) return;
    
    const newSelection: UnifiedSelectionState = {
      type: 'node',
      elementId: nodeId,
      metadata: {
        timestamp: Date.now(),
        previousSelection: selection.type ? { ...selection } : undefined
      }
    };
    
    setSelection(newSelection);
    logger.debug('🎯 Unified selection: Node selected', newSelection);
  }, [selection]);

  const selectConnection = useCallback((connectionId: string) => {
    if (!isFeatureEnabled('UNIFIED_SELECTION')) return;
    
    const newSelection: UnifiedSelectionState = {
      type: 'connection',
      elementId: connectionId,
      metadata: {
        timestamp: Date.now(),
        previousSelection: selection.type ? { ...selection } : undefined
      }
    };
    
    setSelection(newSelection);
    logger.debug('🎯 Unified selection: Connection selected', newSelection);
  }, [selection]);

  const clearSelection = useCallback(() => {
    if (!isFeatureEnabled('UNIFIED_SELECTION')) return;
    
    const newSelection: UnifiedSelectionState = {
      type: null,
      elementId: null,
      metadata: {
        timestamp: Date.now(),
        previousSelection: selection.type ? { ...selection } : undefined
      }
    };
    
    setSelection(newSelection);
    logger.debug('🎯 Unified selection: Selection cleared', newSelection);
  }, [selection]);

  const isSelected = useCallback((type: UnifiedSelectionState['type'], elementId: string): boolean => {
    if (!isFeatureEnabled('UNIFIED_SELECTION')) return false;
    
    return selection.type === type && selection.elementId === elementId;
  }, [selection]);

  const hasSelection = selection.type !== null && selection.elementId !== null;

  const contextValue: UnifiedSelectionContextType = {
    selection,
    selectFlow,
    selectNode,
    selectConnection,
    clearSelection,
    isSelected,
    hasSelection
  };

  return (
    <UnifiedSelectionContext.Provider value={contextValue}>
      {children}
    </UnifiedSelectionContext.Provider>
  );
};

export const useUnifiedSelection = (): UnifiedSelectionContextType => {
  const context = useContext(UnifiedSelectionContext);
  if (!context) {
    throw new Error('useUnifiedSelection must be used within UnifiedSelectionProvider');
  }
  return context;
};

/**
 * Hook de compatibilidad que sincroniza el sistema unificado con el sistema tradicional
 */
export const useSelectionSync = (
  traditionalSelectNode: (nodeId: string | null) => void,
  traditionalSelectedNodeId: string | null
) => {
  const { selection, selectNode: unifiedSelectNode, clearSelection } = useUnifiedSelection();

  const selectNode = useCallback((nodeId: string | null) => {
    // Siempre usar el sistema tradicional
    traditionalSelectNode(nodeId);
    
    // Si el sistema unificado está habilitado, sincronizar
    if (isFeatureEnabled('UNIFIED_SELECTION')) {
      if (nodeId) {
        unifiedSelectNode(nodeId);
      } else {
        clearSelection();
      }
    }
  }, [traditionalSelectNode, unifiedSelectNode, clearSelection]);

  // Información del sistema unificado (si está habilitado)
  const unifiedInfo = isFeatureEnabled('UNIFIED_SELECTION') ? {
    hasUnifiedSelection: selection.type !== null,
    unifiedSelectionType: selection.type,
    unifiedElementId: selection.elementId,
    selectionMetadata: selection.metadata
  } : null;

  return {
    selectNode,
    unifiedInfo,
    // Mantener compatibilidad con el sistema tradicional
    selectedNodeId: traditionalSelectedNodeId
  };
};
