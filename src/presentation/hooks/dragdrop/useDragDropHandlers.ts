import { useCallback } from 'react';
import { migrationLog, performanceMonitor } from '../../../shared/config/migrationFlags';
import { logger } from '../../../shared/utils';

export interface DragDropHandlersOptions {
  actions: any;
  project: (position: { x: number; y: number }) => { x: number; y: number };
  nodes: any[];
  currentFlow?: any;
}

export interface DragDropHandlersReturn {
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
}

/**
 * Hook para manejar eventos de drag & drop de nuevos nodos
 * Gestiona el arrastre desde la paleta de nodos al canvas
 */
export const useDragDropHandlers = (options: DragDropHandlersOptions): DragDropHandlersReturn => {
  const { actions, project, nodes, currentFlow } = options;

  const onDrop = useCallback((event: React.DragEvent) => {
    const startTime = performance.now();
    migrationLog('DRAG_DROP', 'Drop event triggered');
    
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    
    // Registrar todos los tipos de datos disponibles
    logger.debug('Available data types:', event.dataTransfer.types);
    migrationLog('DRAG_DROP', 'Available data types', { types: event.dataTransfer.types });
    
    // Intentar obtener nodeType con múltiples estrategias
    let nodeType: string | null = null;
    
    // Estrategia 1: Intenta obtener de application/reactflow
    try {
      nodeType = event.dataTransfer.getData('application/reactflow');
      logger.debug('Strategy 1 - application/reactflow:', nodeType);
      if (nodeType) migrationLog('DRAG_DROP', 'NodeType found via strategy 1', { nodeType });
    } catch (e) {
      logger.warn('Error getting application/reactflow data:', e);
    }
    
    // Estrategia 2: Intenta obtener de text/plain
    if (!nodeType) {
      try {
        nodeType = event.dataTransfer.getData('text/plain');
        logger.debug('Strategy 2 - text/plain:', nodeType);
        if (nodeType) migrationLog('DRAG_DROP', 'NodeType found via strategy 2', { nodeType });
      } catch (e) {
        logger.warn('Error getting text/plain data:', e);
      }
    }
    
    // Estrategia 3: Intenta obtener de formato simple nodeType
    if (!nodeType) {
      try {
        nodeType = event.dataTransfer.getData('nodeType');
        logger.debug('Strategy 3 - nodeType format:', nodeType);
        if (nodeType) migrationLog('DRAG_DROP', 'NodeType found via strategy 3', { nodeType });
      } catch (e) {
        logger.warn('Error getting nodeType data:', e);
      }
    }
    
    // Estrategia 4: Buscar elementos en el DOM con data-node-type
    if (!nodeType) {
      try {
        const dragElements = document.querySelectorAll('[data-node-type]');
        if (dragElements.length > 0) {
          // Convertir NodeList a array para iterar de forma segura
          Array.from(dragElements).forEach(el => {
            const dataType = el.getAttribute('data-node-type');
            if (dataType && !nodeType) {
              nodeType = dataType;
              logger.debug('Strategy 4 - Found from DOM elements:', nodeType);
              migrationLog('DRAG_DROP', 'NodeType found via strategy 4', { nodeType });
            }
          });
        }
      } catch (e) {
        logger.warn('Error getting nodeType from DOM:', e);
      }
    }
    
    // Estrategia 5: Revisar en localStorage como último recurso
    if (!nodeType) {
      try {
        nodeType = localStorage.getItem('dragging-node-type');
        logger.debug('Strategy 5 - localStorage fallback:', nodeType);
        if (nodeType) {
          migrationLog('DRAG_DROP', 'NodeType found via strategy 5', { nodeType });
          // Limpiar después de usar
          localStorage.removeItem('dragging-node-type');
        }
      } catch (e) {
        logger.warn('Error accessing localStorage:', e);
      }
    }
    
    // Estrategia 6: Detectar elementos visibles que están siendo arrastrados
    if (!nodeType) {
      try {
        const paletteItems = document.querySelectorAll('.node-palette__item');
        Array.from(paletteItems).forEach(item => {
          if (item instanceof HTMLElement && item.style.opacity === '0.5' && !nodeType) {
            // Este elemento probablemente está siendo arrastrado
            const type = item.getAttribute('data-node-type');
            if (type) {
              nodeType = type;
              logger.debug('Strategy 6 - Found from opacity check:', nodeType);
              migrationLog('DRAG_DROP', 'NodeType found via strategy 6', { nodeType });
            }
          }
        });
      } catch (e) {
        logger.warn('Error in strategy 6:', e);
      }
    }
    
    // Comprobación final
    if (!nodeType) {
      // SOLUCIÓN TEMPORAL: Si todo falla, usar un tipo por defecto
      nodeType = 'step'; // Usar un tipo válido como fallback
      logger.warn('⚠️ No se pudo detectar el tipo de nodo, usando tipo por defecto:', nodeType);
      migrationLog('DRAG_DROP', 'Using fallback nodeType', { nodeType });
      // return; // Descomentar para cancelar si no se encuentra ningún tipo
    }

    // Obtener la posición relativa al canvas de ReactFlow
    const reactFlowBounds = (event.currentTarget as Element).getBoundingClientRect();
    const rawPosition = project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    logger.debug('Raw drop position:', rawPosition);
    migrationLog('DRAG_DROP', 'Raw position calculated', { rawPosition });
    
    // AJUSTAR POSICIÓN PARA EVITAR SOLAPAMIENTO
    const adjustedPosition = { ...rawPosition };
    
    // Verificar si hay nodos cercanos y ajustar posición
    const existingNodes = nodes;
    const minDistance = 150; // Distancia mínima entre nodos
    
    let attempts = 0;
    let positionOk = false;
    
    while (!positionOk && attempts < 10) {
      positionOk = true;
      
      for (const existingNode of existingNodes) {
        const distance = Math.sqrt(
          Math.pow(adjustedPosition.x - existingNode.position.x, 2) +
          Math.pow(adjustedPosition.y - existingNode.position.y, 2)
        );
        
        if (distance < minDistance) {
          logger.debug(`Position too close to node ${existingNode.id} (distance: ${distance}), adjusting...`);
          // Mover hacia abajo y ligeramente a la derecha
          adjustedPosition.x += 30;
          adjustedPosition.y += 50;
          positionOk = false;
          break;
        }
      }
      
      attempts++;
    }
    
    logger.debug('Final adjusted position:', adjustedPosition);
    logger.debug('Calling addNode with:', { nodeType, position: adjustedPosition });
    migrationLog('DRAG_DROP', 'Position adjusted', { 
      finalPosition: adjustedPosition, 
      attempts,
      existingNodesCount: existingNodes.length 
    });
    
    try {
      // Clean up any visual indicators
      const flowElement = document.querySelector('.react-flow');
      if (flowElement && flowElement.classList.contains('drop-target')) {
        flowElement.classList.remove('drop-target');
      }
      
      // Reset cursor
      document.body.style.cursor = '';
      document.body.classList.remove('node-dragging');

      // Add the node
      actions.addNode(nodeType, adjustedPosition);
      logger.success('addNode called successfully');
      migrationLog('DRAG_DROP', 'Node added successfully', { nodeType, position: adjustedPosition });
      
      // Show visual feedback of success
      setTimeout(() => {
        // Flash the canvas briefly to indicate success
        if (flowElement) {
          flowElement.classList.add('drop-success');
          setTimeout(() => {
            flowElement.classList.remove('drop-success');
          }, 300);
        }
      }, 10);
      
      // Persistir la posición del nuevo nodo
      if (currentFlow) {
        // Generar un ID temporal para el nodo (el ID real se generará en el useCase)
        // Esto se sincronizará cuando el nodo se agregue al estado
        logger.debug('New node position will be persisted after state update');
        migrationLog('DRAG_DROP', 'Position persistence scheduled', { flowId: currentFlow.id });
      }
    } catch (error) {
      logger.error('Error in addNode:', error);
      migrationLog('DRAG_DROP', 'Error adding node', { 
        error: error instanceof Error ? error.message : String(error), 
        nodeType 
      });
      
      // Show visual feedback of error
      const flowElement = document.querySelector('.react-flow');
      if (flowElement) {
        flowElement.classList.add('drop-error');
        setTimeout(() => {
          flowElement.classList.remove('drop-error');
        }, 300);
      }
    }
    
    performanceMonitor('onDrop', startTime);
  }, [actions, project, nodes, currentFlow]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    migrationLog('DRAG_DROP', 'Drag over event');
    
    event.preventDefault();
    event.stopPropagation(); // Detener la propagación para evitar conflictos
    
    // Asegurar que se muestre el efecto de "copiar" en lugar de "mover"
    event.dataTransfer.dropEffect = 'copy';
    
    // Cambiar el cursor para dar retroalimentación visual clara
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.style.cursor = 'copy';
      
      // Añadir clase de resaltado al objetivo de soltar
      const flowElement = document.querySelector('.react-flow');
      if (flowElement && !flowElement.classList.contains('drop-target')) {
        flowElement.classList.add('drop-target');
        
        // Asegurar que también se añada la clase al viewport interno
        const viewport = document.querySelector('.react-flow__viewport');
        if (viewport) {
          viewport.classList.add('drop-target-viewport');
        }
      }
    }
    
    // Verificar si tenemos datos válidos en cualquier formato
    const validTypes = ['application/reactflow', 'text/plain', 'nodeType'];
    let hasValidData = false;
    
    try {
      for (const type of validTypes) {
        if (event.dataTransfer.types.includes(type)) {
          hasValidData = true;
          break;
        }
      }
      
      // También verificar si hay algún elemento en arrastre
      if (!hasValidData && document.body.classList.contains('node-dragging')) {
        hasValidData = true; // Asumir que hay un arrastre válido basado en el estado del body
      }
    } catch (error) {
      logger.error('Error verificando tipos de datos en onDragOver:', error);
      migrationLog('DRAG_DROP', 'Error verifying data types', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Si estamos en arrastre, mostrarlo claramente en la consola
    logger.debug('🔄 Drag over canvas, valid data:', hasValidData);
    migrationLog('DRAG_DROP', 'Drag over validation', { hasValidData, types: event.dataTransfer.types });
    
    return false; // Asegurar que el navegador maneje el evento correctamente
  }, []);

  return {
    onDrop,
    onDragOver
  };
};
