import React from 'react';
import { migrationLog } from '../../../shared/config/migrationFlags';

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
  migrationLog('UTILITIES', 'detectStructuralChanges called', { sourceCount: sourceNodes.length, targetCount: targetNodes.length });
  
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
      migrationLog('UTILITIES', 'Using persisted position', { nodeId, position: validatedPosition });
      return validatedPosition;
    }
  }
  
  // SEGUNDO, usar la referencia actual si existe
  const existingPosition = positionsRef.current.get(nodeId);
  if (existingPosition) {
    migrationLog('UTILITIES', 'Using ref position', { nodeId, position: existingPosition });
    return existingPosition;
  }
  
  // TERCERO, usar la posición del estado (modelo de dominio) si es válida
  const validatedStatePos = validateAndRoundPosition(statePosition);
  if (validatedStatePos) {
    migrationLog('UTILITIES', 'Using state position', { nodeId, position: validatedStatePos });
    return validatedStatePos;
  }
  
  // Si todo falla, generar una posición por defecto calculada para evitar el amontonamiento
  // Usamos el nodeId como semilla para distribuir los nodos de manera determinística
  // Esto asegura que cada nodo tenga su propia posición única basada en su ID
  // y que siempre aparezca en la misma posición en cada carga si no hay otra información
  const seed = nodeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Creamos una cuadrícula virtual para distribuir los nodos de manera espaciada
  // con 5 columnas, cada una de 150px de ancho
  const x = 100 + (seed % 5) * 150; // Distribuir horizontalmente
  const y = 100 + Math.floor((seed % 25) / 5) * 150; // Distribuir verticalmente en 5 filas
  
  const defaultPosition = { x, y };
  migrationLog('UTILITIES', 'Using default calculated position', { nodeId, position: defaultPosition });
  return defaultPosition;
};

/**
 * Función para manejar la eliminación de nodos con feedback visual
 * @param nodeId - ID del nodo a eliminar
 * @param setNodes - Función para actualizar nodos en React Flow
 * @param actions - Acciones de FlowContext
 * @param isSyncingRef - Referencia al estado de sincronización
 * @returns Promesa que se resuelve cuando la eliminación visual está completa
 */
export const handleNodeDeletion = async (
  nodeId: string,
  setNodes: (updater: any) => void,
  actions: any,
  isSyncingRef: React.MutableRefObject<boolean>
): Promise<void> => {
  migrationLog('UTILITIES', 'Starting node deletion', { nodeId });
  
  // Activar bloqueo de sincronización
  isSyncingRef.current = true;
  
  // Paso 1: Marcar visualmente el nodo como "en proceso de eliminación"
  setNodes((currNodes: any[]) => 
    currNodes.map(node => 
      node.id === nodeId 
        ? { 
            ...node, 
            style: { ...node.style, opacity: 0.2 },
            data: { 
              ...node.data,
              config: { ...node.data?.config, _deletionInProgress: true }
            }
          }
        : node
    )
  );
  
  // Esperar a que la animación visual se complete
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    // Paso 2: Eliminar del modelo de dominio (a través de FlowContext)
    await actions.removeNode(nodeId);
    
    // Paso 3: Eliminar completamente de React Flow
    setNodes((currNodes: any[]) => currNodes.filter(node => node.id !== nodeId));
    
    // Esperar para asegurar que la UI se actualiza
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Paso 4: Forzar refresh del canvas
    try {
      const instance = document.querySelector('.react-flow');
      if (instance) {
        instance.dispatchEvent(new Event('refresh', { bubbles: true }));
      }
    } catch (e) {
      console.warn('No se pudo forzar refresh del canvas:', e);
    }
    
    migrationLog('UTILITIES', 'Node deletion completed successfully', { nodeId });
    
  } catch (error) {
    console.error('Error al eliminar nodo:', error);
    migrationLog('UTILITIES', 'Error during node deletion', { nodeId, error });
    
    // Failsafe: intentar eliminar de la UI si falla la acción
    setNodes((currNodes: any[]) => currNodes.filter(n => n.id !== nodeId));
  } finally {
    // Liberar el bloqueo después de todas las operaciones
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 100);
  }
};
