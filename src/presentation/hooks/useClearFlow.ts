import { useState } from 'react';
import { ViewportPersistenceService } from '../../infrastructure/services/ViewportPersistenceService';

interface UseClearFlowProps {
  nodes: any[];
  edges: any[];
}

/**
 * Hook para manejar la confirmación y limpieza de datos del flujo
 * Solo muestra el botón cuando hay nodos o conexiones visibles
 */
export const useClearFlow = ({ nodes, edges }: UseClearFlowProps) => {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  // El botón aparece solo cuando hay contenido visual en el canvas
  const hasVisualContent = nodes.length > 0 || edges.length > 0;
  
  const clearAllFlowData = () => {
    try {
      // Crear instancia del servicio de viewport
      const viewportService = new ViewportPersistenceService();
      
      // Limpiar todos los viewports
      viewportService.clearAllViewports();
      
      // Limpiar localStorage SOLO de datos relacionados al flujo
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('flow_designer_flow_') ||           // Flujos completos
          key.startsWith('flow-designer-positions') ||       // Posiciones de nodos
          key.startsWith('flow-designer-viewports') ||       // Viewports del canvas
          key.startsWith('reactflow-')                       // Datos internos de ReactFlow
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🗑️ Removed key:', key);
      });
      
      console.log('✅ Todos los datos del flujo han sido eliminados');
      console.log('📊 Keys eliminadas:', keysToRemove.length);
      
      // Recargar la página para asegurar un estado limpio
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error al limpiar datos del flujo:', error);
    }
  };
  
  const requestClearData = () => {
    setIsConfirmDialogOpen(true);
  };
  
  const handleConfirmClear = () => {
    setIsConfirmDialogOpen(false);
    clearAllFlowData();
  };
  
  const handleCancelClear = () => {
    setIsConfirmDialogOpen(false);
  };
  
  return {
    isConfirmDialogOpen,
    hasVisualContent,
    requestClearData,
    handleConfirmClear,
    handleCancelClear
  };
};
