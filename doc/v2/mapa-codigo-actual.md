# Mapa Detallado de useFlowDesigner.ts - ANÁLISIS COMPLETO

## 🔍 **Estructura Actual (1583 líneas)**

### **📍 Sección 1: Imports y Utilidades (líneas 1-150)**
```typescript
// Líneas 1-11: Imports
import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useReactFlow, useNodesState, useEdgesState } from 'reactflow';
// ... más imports

// Líneas 12-40: detectStructuralChanges function
const detectStructuralChanges = (sourceNodes, targetNodes) => { ... }

// Líneas 41-65: validateAndRoundPosition function  
const validateAndRoundPosition = (position) => { ... }

// Líneas 66-150: determineFinalPosition function
const determineFinalPosition = (nodeId, statePosition, ...) => { ... }
```

### **📍 Sección 2: Hook Principal - Setup (líneas 151-300)**
```typescript
// Líneas 185-200: Hook principal y servicios
export const useFlowDesigner = () => {
  const { state, actions } = useFlowContext();
  const { project, getViewport, setViewport } = useReactFlow();
  // Servicios de persistencia
  const positionPersistence = useMemo(() => new PositionPersistenceService(), []);
  const viewportPersistence = useMemo(() => new ViewportPersistenceService(), []);
```

### **📍 Sección 3: Referencias y Estado (líneas 200-350)**
```typescript
// Líneas 200-250: Referencias
const nodePositionsRef = useRef(new Map());
const draggingNodesRef = useRef(new Set());
const initialRenderCompleteRef = useRef(false);
// ... más refs
```

### **📍 Sección 4: Funciones de Firma y Sincronización (líneas 350-500)**
```typescript
// Líneas 215-255: getNodesSignature function
const getNodesSignature = useCallback(() => { ... }, []);

// Funciones de sincronización
```

### **📍 Sección 5: Transformación de Datos (líneas 500-800)**
```typescript
// Líneas 255-320: initialNodes useMemo
const initialNodes: FlowNode[] = useMemo(() => { ... }, []);

// Líneas 320-380: initialEdges useMemo  
const initialEdges: FlowEdge[] = useMemo(() => { ... }, []);
```

### **📍 Sección 6: Event Handlers Principales (líneas 800-1200)**
```typescript
// Líneas 756-1010: handleNodesChange (INTERCEPTOR NUCLEAR)
const handleNodesChange = useCallback((changes: any[]) => { ... }, []);

// Líneas 1010-1026: handleEdgesChange
const handleEdgesChange = useCallback((changes: any[]) => { ... }, []);

// Líneas 1026-1050: onConnectStart
const onConnectStart = useCallback((event: any, params: any) => { ... }, []);

// Líneas 1050-1066: onConnectEnd
const onConnectEnd = useCallback((event: any) => { ... }, []);

// Líneas 1066-1170: onConnect  
const onConnect = useCallback((params: any) => { ... }, []);
```

### **📍 Sección 7: Drag & Drop (líneas 1200-1400)**
```typescript
// Líneas 1170-1358: onDrop
const onDrop = useCallback((event: React.DragEvent) => { ... }, []);

// Líneas 1358-1408: onDragOver
const onDragOver = useCallback((event: React.DragEvent) => { ... }, []);
```

### **📍 Sección 8: Utilidades y Helpers (líneas 1400-1550)**
```typescript
// Líneas 1408-1413: getSelectedNode
const getSelectedNode = useCallback(() => { ... }, []);

// Líneas 1413-1417: getNodeTypeConfig
const getNodeTypeConfig = useCallback((nodeType: NodeType) => { ... }, []);

// Líneas 1417-1421: getPersistenceStats
const getPersistenceStats = useCallback(() => { ... }, []);

// Líneas 1421-1429: clearPersistedPositions
const clearPersistedPositions = useCallback(() => { ... }, []);

// Líneas 1429-1461: isValidConnection
const isValidConnection = useCallback((connection: any) => { ... }, []);

// Líneas 1461-1520: getConnectionHelp
const getConnectionHelp = useCallback((sourceNodeType, targetNodeType, handleType) => { ... }, []);
```

### **📍 Sección 9: Viewport Management (líneas 1520-1583)**
```typescript
// Líneas 1520-1531: saveCurrentViewport
const saveCurrentViewport = useCallback(() => { ... }, []);

// Líneas 1531-1536: getViewportStats
const getViewportStats = useCallback(() => { ... }, []);

// Líneas 1536-1543: clearPersistedViewport
const clearPersistedViewport = useCallback(() => { ... }, []);

// Líneas 1543-1550: hasPersistedViewport
const hasPersistedViewport = useCallback(() => { ... }, []);

// Líneas 1550-1583: Return del hook (API pública)
return {
  // Estado
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode: getSelectedNode(),
  // ... resto del return
};
```

## 🎯 **Plan de Extracción Segura**

### **ORDEN DE EXTRACCIÓN** (para evitar dependencias rotas):

1. **PRIMERO**: Funciones utilitarias independientes (detectStructuralChanges, validateAndRoundPosition, determineFinalPosition)
2. **SEGUNDO**: Viewport management (sin dependencias del hook principal)
3. **TERCERO**: Utilities y helpers (dependen solo del estado)
4. **CUARTO**: Servicios de persistencia y posición
5. **QUINTO**: Data transformers (initialNodes, initialEdges)
6. **SEXTO**: Drag & Drop handlers
7. **SÉPTIMO**: Edge handlers
8. **OCTAVO**: Node handlers (INTERCEPTOR NUCLEAR - más complejo)
9. **NOVENO**: Estado principal
10. **DÉCIMO**: Hook principal simplificado

### **VALIDACIONES ANTES DE CADA EXTRACCIÓN**:
- ✅ Verificar todas las dependencias
- ✅ Confirmar imports necesarios
- ✅ Mapear todas las variables/funciones referenciadas
- ✅ Probar compilación después de cada paso
- ✅ Mantener backup del archivo original

## ⚠️ **DEPENDENCIAS CRÍTICAS IDENTIFICADAS**

### **Variables compartidas entre secciones**:
- `nodePositionsRef` - Usado en múltiples handlers
- `draggingNodesRef` - Crítico para interceptor nuclear
- `positionPersistence` - Usado en varios lugares
- `viewportPersistence` - Solo en viewport functions
- `state` y `actions` - Del FlowContext
- `setNodes`, `setEdges` - De ReactFlow

### **Funciones que dependen unas de otras**:
- `handleNodesChange` depende de `determineFinalPosition`, `validateAndRoundPosition`, `detectStructuralChanges`
- `onDrop` depende de `determineFinalPosition`
- `initialNodes` depende de `determineFinalPosition`

## 🚨 **RIESGOS A EVITAR**
1. **Dependencias circulares** entre módulos
2. **Referencias rotas** a variables movidas
3. **Imports faltantes** en módulos extraídos
4. **Estado compartido** mal gestionado
5. **Hooks rules violation** al componer hooks

## ✅ **ESTRATEGIA DE MITIGACIÓN**
1. **Extraer funciones puras PRIMERO** (sin dependencias)
2. **Mover referencias compartidas a un módulo común**
3. **Validar compilación en cada paso**
4. **Mantener tests funcionando**
5. **Feature flag para rollback inmediato**
