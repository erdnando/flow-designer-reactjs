/**
 * Inicializa variables globales necesarias para el funcionamiento de la aplicación
 */
export const initializeGlobals = (): void => {
  // Inicializar el registro de timeouts para mover nodos
  window.nodeMoveTimeouts = window.nodeMoveTimeouts || {};

  // Inicializar la referencia a la instancia de ReactFlow
  window.reactFlowInstance = window.reactFlowInstance || undefined;

  // Inicializar el objeto para rastrear nodos arrastrados
  window.draggedNode = window.draggedNode || undefined;

  console.log('✅ Global variables initialized');
}

/**
 * Registra un nodo que está siendo arrastrado
 */
export const registerNodeDrag = (nodeId: string, x: number, y: number): void => {
  window.draggedNode = {
    id: nodeId,
    lastX: x,
    lastY: y,
    timestamp: Date.now()
  };
}

/**
 * Limpia la referencia a un nodo arrastrado
 */
export const clearDraggedNode = (): void => {
  window.draggedNode = undefined;
}
