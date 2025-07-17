/**
 * Provider maestro para todos los contextos separados
 * Fase 5: Separación de contextos - Integración completa
 */

import React, { ReactNode } from 'react';
import { UnifiedSelectionProvider } from './UnifiedSelectionContext';
import { FlowDataProvider } from './FlowDataContext';
import { NodeOperationsProvider } from './NodeOperationsContext';
import { ConnectionOperationsProvider } from './ConnectionOperationsContext';
import { isFeatureEnabled } from '../config/featureFlags';
import { logger } from '../utils/logger';

export const CombinedContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (isFeatureEnabled('SEPARATED_CONTEXTS')) {
    logger.debug('🎯 Using separated contexts architecture');
    
    return (
      <UnifiedSelectionProvider>
        <FlowDataProvider>
          <NodeOperationsProvider>
            <ConnectionOperationsProvider>
              {children}
            </ConnectionOperationsProvider>
          </NodeOperationsProvider>
        </FlowDataProvider>
      </UnifiedSelectionProvider>
    );
  }

  // Fallback: usar solo el sistema de selección unificado
  logger.debug('🔄 Using unified context architecture');
  return (
    <UnifiedSelectionProvider>
      {children}
    </UnifiedSelectionProvider>
  );
};

// Hook simplificado para acceder a información sobre la arquitectura de contextos
export const useCombinedContextsInfo = () => {
  return {
    architecture: isFeatureEnabled('SEPARATED_CONTEXTS') ? 'separated' : 'unified',
    hasSeparatedContexts: isFeatureEnabled('SEPARATED_CONTEXTS'),
    hasUnifiedSelection: isFeatureEnabled('UNIFIED_SELECTION')
  };
};
