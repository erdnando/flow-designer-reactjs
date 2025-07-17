import { Node, Edge } from 'reactflow';
import { NodeType } from '../types';

export interface NodeValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface NodeValidator {
  validateStartNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateEndNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateStepNode(node: Node, edges: Edge[]): NodeValidationResult;
  validateIfNode(node: Node, edges: Edge[]): NodeValidationResult;
}

export class DefaultNodeValidator implements NodeValidator {
  
  validateStartNode(node: Node, edges: Edge[]): NodeValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Verificar si el nodo START tiene conexiones de salida
    const outgoingConnections = edges.filter(edge => edge.source === node.id);
    
    if (outgoingConnections.length === 0) {
      warnings.push('El nodo START no tiene conexiones de salida');
    }
    
    // Verificar que no tenga conexiones de entrada
    const incomingConnections = edges.filter(edge => edge.target === node.id);
    if (incomingConnections.length > 0) {
      errors.push('El nodo START no debería tener conexiones de entrada');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
  
  validateEndNode(node: Node, edges: Edge[]): NodeValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Verificar si el nodo END tiene conexiones de entrada
    const incomingConnections = edges.filter(edge => edge.target === node.id);
    
    if (incomingConnections.length === 0) {
      warnings.push('El nodo END no tiene conexiones de entrada');
    }
    
    // Verificar que no tenga conexiones de salida
    const outgoingConnections = edges.filter(edge => edge.source === node.id);
    if (outgoingConnections.length > 0) {
      errors.push('El nodo END no debería tener conexiones de salida');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
  
  validateStepNode(node: Node, edges: Edge[]): NodeValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Verificar conexiones de entrada
    const incomingConnections = edges.filter(edge => edge.target === node.id);
    if (incomingConnections.length === 0) {
      warnings.push('El nodo STEP no tiene conexiones de entrada');
    }
    
    // Verificar conexiones de salida
    const outgoingConnections = edges.filter(edge => edge.source === node.id);
    if (outgoingConnections.length === 0) {
      warnings.push('El nodo STEP no tiene conexiones de salida');
    }
    
    // Verificar propiedades del nodo
    if (!node.data.label || node.data.label.trim().length === 0) {
      warnings.push('El nodo STEP no tiene etiqueta');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
  
  validateIfNode(node: Node, edges: Edge[]): NodeValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Verificar conexiones de entrada
    const incomingConnections = edges.filter(edge => edge.target === node.id);
    if (incomingConnections.length === 0) {
      warnings.push('El nodo IF no tiene conexiones de entrada');
    }
    
    // Verificar conexiones de salida - debería tener al menos 2 (true y false)
    const outgoingConnections = edges.filter(edge => edge.source === node.id);
    if (outgoingConnections.length === 0) {
      warnings.push('El nodo IF no tiene conexiones de salida');
    } else if (outgoingConnections.length < 2) {
      warnings.push('El nodo IF debería tener al menos 2 conexiones de salida (verdadero y falso)');
    }
    
    // Verificar configuración de condición
    if (!node.data.condition || node.data.condition.trim().length === 0) {
      warnings.push('El nodo IF no tiene condición configurada');
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// Función utilitaria para validar cualquier nodo
export function validateNode(node: Node, edges: Edge[], validator: NodeValidator = new DefaultNodeValidator()): NodeValidationResult {
  const nodeType = node.data.nodeType as NodeType;
  
  switch (nodeType) {
    case 'start':
      return validator.validateStartNode(node, edges);
    case 'end':
      return validator.validateEndNode(node, edges);
    case 'step':
      return validator.validateStepNode(node, edges);
    case 'if':
      return validator.validateIfNode(node, edges);
    default:
      return {
        isValid: true,
        warnings: [],
        errors: []
      };
  }
}

// Función para validar todos los nodos en un flujo
export function validateFlow(nodes: Node[], edges: Edge[], validator: NodeValidator = new DefaultNodeValidator()): Record<string, NodeValidationResult> {
  const results: Record<string, NodeValidationResult> = {};
  
  nodes.forEach(node => {
    results[node.id] = validateNode(node, edges, validator);
  });
  
  return results;
}
