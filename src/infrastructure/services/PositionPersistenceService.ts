import type { Position } from '../../domain/value-objects/Position';

export interface PersistedPosition {
  nodeId: string;
  position: Position;
  timestamp: number;
}

export interface PersistedFlowLayout {
  flowId: string;
  positions: PersistedPosition[];
  lastUpdated: number;
}

export class PositionPersistenceService {
  private static instance?: PositionPersistenceService;
  private readonly storageKey = 'flow-layouts';
  private loggedFlows = new Set<string>(); // Track flows we've already logged
  private saveTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly SAVE_DEBOUNCE_MS = 500; // Debounce saves por 500ms

  /**
   * Guardar las posiciones de los nodos de un flujo (con debouncing)
   */
  saveFlowPositions(flowId: string, positions: Map<string, Position>): void {
    // Cancelar timeout anterior si existe
    if (this.saveTimeouts.has(flowId)) {
      clearTimeout(this.saveTimeouts.get(flowId)!);
    }

    // Programar nuevo save con debounce
    const timeout = setTimeout(() => {
      this.performSave(flowId, positions);
      this.saveTimeouts.delete(flowId);
    }, this.SAVE_DEBOUNCE_MS);

    this.saveTimeouts.set(flowId, timeout);
  }

  /**
   * Realizar el save real (método privado)
   */
  private performSave(flowId: string, positions: Map<string, Position>): void {
    try {
      const persistedPositions: PersistedPosition[] = Array.from(positions.entries()).map(([nodeId, position]) => ({
        nodeId,
        position,
        timestamp: Date.now()
      }));

      const layout: PersistedFlowLayout = {
        flowId,
        positions: persistedPositions,
        lastUpdated: Date.now()
      };

      const existingData = this.getAllFlowLayouts();
      const updatedData = {
        ...existingData,
        [flowId]: layout
      };

      localStorage.setItem(this.storageKey, JSON.stringify(updatedData));
      
      // OPTIMIZACIÓN: Solo loggear saves no-frecuentes para reducir spam
      console.log('💾 Positions saved for flow:', flowId, 'Positions count:', persistedPositions.length);
    } catch (error) {
      console.error('❌ Error saving positions:', error);
    }
  }

  /**
   * Cargar las posiciones de los nodos de un flujo
   */
  loadFlowPositions(flowId: string): Map<string, Position> {
    try {
      const allLayouts = this.getAllFlowLayouts();
      const layout = allLayouts[flowId];
      
      if (!layout) {
        // Only log once per flow to prevent spam
        if (!this.loggedFlows.has(flowId)) {
          console.log('📖 No persisted positions found for flow:', flowId);
          this.loggedFlows.add(flowId);
        }
        return new Map();
      }

      const positionsMap = new Map<string, Position>();
      layout.positions.forEach(({ nodeId, position }) => {
        positionsMap.set(nodeId, position);
      });

      // Log removed to prevent infinite loops
      // console.log('📖 Loaded positions for flow:', flowId, 'Positions count:', positionsMap.size);
      return positionsMap;
    } catch (error) {
      console.error('❌ Error loading positions:', error);
      return new Map();
    }
  }

  /**
   * Actualizar la posición de un nodo específico
   */
  updateNodePosition(flowId: string, nodeId: string, position: Position): void {
    try {
      const currentPositions = this.loadFlowPositions(flowId);
      currentPositions.set(nodeId, position);
      this.saveFlowPositions(flowId, currentPositions);
      
      console.log('📍 Updated position for node:', nodeId, 'in flow:', flowId);
    } catch (error) {
      console.error('❌ Error updating node position:', error);
    }
  }

  /**
   * Eliminar la posición de un nodo
   */
  removeNodePosition(flowId: string, nodeId: string): void {
    try {
      const currentPositions = this.loadFlowPositions(flowId);
      currentPositions.delete(nodeId);
      this.saveFlowPositions(flowId, currentPositions);
      
      console.log('🗑️ Removed position for node:', nodeId, 'from flow:', flowId);
    } catch (error) {
      console.error('❌ Error removing node position:', error);
    }
  }

  /**
   * Obtener todas las layouts de flujos guardadas
   */
  private getAllFlowLayouts(): Record<string, PersistedFlowLayout> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('❌ Error reading from localStorage:', error);
      return {};
    }
  }

  /**
   * Limpiar las posiciones de un flujo
   */
  clearFlowPositions(flowId: string): void {
    try {
      const allLayouts = this.getAllFlowLayouts();
      delete allLayouts[flowId];
      localStorage.setItem(this.storageKey, JSON.stringify(allLayouts));
      
      console.log('🧹 Cleared positions for flow:', flowId);
    } catch (error) {
      console.error('❌ Error clearing positions:', error);
    }
  }

  /**
   * Obtener estadísticas de persistencia
   */
  getStats(): { totalFlows: number; totalPositions: number; storageSize: number } {
    try {
      const allLayouts = this.getAllFlowLayouts();
      const totalFlows = Object.keys(allLayouts).length;
      const totalPositions = Object.values(allLayouts).reduce((sum, layout) => sum + layout.positions.length, 0);
      const storageSize = localStorage.getItem(this.storageKey)?.length || 0;
      
      return { totalFlows, totalPositions, storageSize };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { totalFlows: 0, totalPositions: 0, storageSize: 0 };
    }
  }
}
