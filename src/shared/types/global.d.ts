interface Window {
  nodeMoveTimeouts?: Record<string, NodeJS.Timeout>;
  reactFlowInstance?: any; // Para almacenar la instancia de ReactFlow si es necesario
  draggedNode?: {
    id: string;
    lastX: number;
    lastY: number;
    timestamp: number;
  }; // Para rastrear información del nodo que se está arrastrando
}
