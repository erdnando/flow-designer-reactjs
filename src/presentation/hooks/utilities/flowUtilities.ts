/**
 * Funciones utilitarias para el manejo de flows
 * Paso 1 de la modularización gradual - Funciones puras sin efectos secundarios
 */

/**
 * Función utilidad para detectar cambios estructurales entre conjuntos de nodos
 * @param sourceNodes - Los nodos de origen (generalmente del estado de la aplicación)
 * @param targetNodes - Los nodos destino (generalmente del estado de ReactFlow)
 * @returns True si hay cambios estructurales significativos (nodos añadidos/eliminados)
 */
export const detectStructuralChanges = (
  sourceNodes: { id: string }[], 
  targetNodes: { id: string }[]
): boolean => {
  // Caso 1: Diferente número de nodos
  if (sourceNodes.length !== targetNodes.length) {
    return true;
  }
  
  // Caso 2: Verificar si todos los IDs coinciden
  const sourceIds = new Set(sourceNodes.map(node => node.id));
  
  // Verificar si hay algún nodo en target que no esté en source
  const hasUnknownNodes = targetNodes.some(node => !sourceIds.has(node.id));
  if (hasUnknownNodes) {
    return true;
  }
  
  // Verificar si el número de IDs únicos coincide con el número de nodos
  // (esto detecta duplicados en cualquier colección)
  if (sourceIds.size !== sourceNodes.length) {
    return true;
  }
  
  return false; // No hay cambios estructurales
};

/**
 * Función utilidad para validar y redondear coordenadas de posición
 * @param position - La posición a validar
 * @returns La posición redondeada o undefined si no es válida
 */
export const validateAndRoundPosition = (position: any): { x: number, y: number } | undefined => {
  if (position && 
      typeof position.x === 'number' && 
      typeof position.y === 'number' &&
      !isNaN(position.x) && 
      !isNaN(position.y)) {
    return {
      x: Math.round(position.x),
      y: Math.round(position.y)
    };
  }
  return undefined;
};

/**
 * Función utilidad para determinar la posición final de un nodo considerando todas las fuentes
 * @param nodeId - El ID del nodo
 * @param statePosition - Posición almacenada en el estado
 * @param positionsRef - Referencia de posiciones actuales
 * @param persistedPositions - Mapa de posiciones persistidas
 * @returns La posición final a utilizar para el nodo
 */
export const determineFinalPosition = (
  nodeId: string,
  statePosition: any,
  positionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>,
  persistedPositions: Map<string, any>,
  isInitialLoad: boolean = false
): { x: number, y: number } => {
  // NUEVA PRIORIDAD DE POSICIONES:
  // 1. Posición persistida (del localStorage) - Más prioritario para mantener la última posición conocida
  // 2. Ref actual (posición más reciente en la UI)
  // 3. Posición del estado (del modelo de dominio)
  // 4. Posición por defecto calculada (espaciada y no amontonada)
  
  // PRIMERO verificar si hay una posición persistida (esto mantiene la posición después del refresh)
  const persistedPosition = persistedPositions.get(nodeId);
  if (persistedPosition) {
    const validatedPosition = validateAndRoundPosition(persistedPosition);
    if (validatedPosition) {
      return validatedPosition;
    }
  }
  
  // SEGUNDO, usar la referencia actual si existe
  const existingPosition = positionsRef.current.get(nodeId);
  if (existingPosition) {
    return existingPosition;
  }
  
  // TERCERO, validar la posición del estado
  const validatedStatePosition = validateAndRoundPosition(statePosition);
  if (validatedStatePosition) {
    return validatedStatePosition;
  }
  
  // CUARTO, calcular una posición por defecto espaciada
  // Vamos a usar el índice del nodo para generar una posición espaciada
  const nodeIndex = persistedPositions.size; // Usar el tamaño actual como índice aproximado
  const spacing = 200; // Espacio entre nodos
  const cols = 4; // Número de columnas
  
  const col = nodeIndex % cols;
  const row = Math.floor(nodeIndex / cols);
  
  return {
    x: 100 + (col * spacing),
    y: 100 + (row * spacing)
  };
};
