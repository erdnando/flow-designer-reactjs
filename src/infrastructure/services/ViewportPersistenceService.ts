import type { Viewport } from 'reactflow';

export interface PersistedViewport {
  x: number;
  y: number;
  zoom: number;
  timestamp: number;
}

export interface PersistedFlowViewport {
  flowId: string;
  viewport: PersistedViewport;
  lastUpdated: number;
}

/**
 * Servicio para persistir el estado del viewport (zoom y posición) en localStorage
 * Permite mantener la vista del usuario después de refresh
 */
export class ViewportPersistenceService {
  private readonly storageKey = 'flow-designer-viewports';

  /**
   * Guardar el viewport de un flujo
   */
  saveFlowViewport(flowId: string, viewport: Viewport): void {
    try {
      const persistedViewport: PersistedViewport = {
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
        timestamp: Date.now()
      };

      const layout: PersistedFlowViewport = {
        flowId,
        viewport: persistedViewport,
        lastUpdated: Date.now()
      };

      const existingData = this.getAllFlowViewports();
      const updatedData = {
        ...existingData,
        [flowId]: layout
      };

      localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
      
      console.log('💾 Viewport saved for flow:', flowId, 'Viewport:', persistedViewport);
    } catch (error) {
      console.error('❌ Error saving viewport:', error);
    }
  }

  /**
   * Cargar el viewport de un flujo
   */
  loadFlowViewport(flowId: string): Viewport | null {
    try {
      const allViewports = this.getAllFlowViewports();
      const flowViewport = allViewports[flowId];
      
      if (flowViewport) {
        // Log removed to prevent infinite loops
        // console.log('📂 Loaded viewport for flow:', flowId, 'Viewport:', flowViewport.viewport);
        return {
          x: flowViewport.viewport.x,
          y: flowViewport.viewport.y,
          zoom: flowViewport.viewport.zoom
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading viewport:', error);
      return null;
    }
  }

  /**
   * Actualizar el viewport de un flujo específico
   */
  updateFlowViewport(flowId: string, viewport: Viewport): void {
    this.saveFlowViewport(flowId, viewport);
  }

  /**
   * Eliminar el viewport de un flujo
   */
  removeFlowViewport(flowId: string): void {
    try {
      const allViewports = this.getAllFlowViewports();
      delete allViewports[flowId];
      localStorage.setItem(this.storageKey, JSON.stringify(allViewports));
      
      console.log('🗑️ Removed viewport for flow:', flowId);
    } catch (error) {
      console.error('❌ Error removing viewport:', error);
    }
  }

  /**
   * Obtener todos los viewports de flujos guardados
   */
  private getAllFlowViewports(): Record<string, PersistedFlowViewport> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ Error reading viewports from localStorage:', error);
      return {};
    }
  }

  /**
   * Limpiar los viewports de un flujo
   */
  clearFlowViewports(flowId: string): void {
    try {
      const allViewports = this.getAllFlowViewports();
      delete allViewports[flowId];
      localStorage.setItem(this.storageKey, JSON.stringify(allViewports));
      
      console.log('🧹 Cleared viewport for flow:', flowId);
    } catch (error) {
      console.error('❌ Error clearing viewport:', error);
    }
  }

  /**
   * Obtener estadísticas de persistencia de viewports
   */
  getStats(): { totalFlows: number; storageSize: number } {
    try {
      const allViewports = this.getAllFlowViewports();
      const totalFlows = Object.keys(allViewports).length;
      const storageSize = localStorage.getItem(this.storageKey)?.length || 0;
      
      return { totalFlows, storageSize };
    } catch (error) {
      console.error('❌ Error getting viewport stats:', error);
      return { totalFlows: 0, storageSize: 0 };
    }
  }

  /**
   * Limpiar todos los viewports guardados
   */
  clearAllViewports(): void {
    try {
      localStorage.removeItem(this.storageKey);
      console.log('🧹 All viewports cleared');
    } catch (error) {
      console.error('❌ Error clearing all viewports:', error);
    }
  }
}
