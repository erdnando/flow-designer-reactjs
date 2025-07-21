# Plan de Descomposición Modular - useFlowDesigner

## 🎯 Objetivo
Descomponer `useFlowDesigner.ts` (1583 líneas) en módulos especializados y manejables (<200 líneas cada uno).

## 📊 Análisis de Responsabilidades Actuales

### Responsabilidades Identificadas (8 grupos principales):

1. **🔄 State & Synchronization** (~300 líneas)
2. **📍 Position & Persistence** (~250 líneas) 
3. **🎯 Event Handlers** (~400 líneas)
4. **🔌 Connection Logic** (~200 líneas)
5. **🚀 Drag & Drop** (~200 líneas)
6. **📊 Data Transformation** (~150 líneas)
7. **🔍 Utilities & Helpers** (~100 líneas)
8. **📈 Viewport Management** (~100 líneas)

## 🏗️ Estructura de Módulos Propuesta

### Módulo 1: `useFlowState.ts` (~150-200 líneas)
**Responsabilidad**: Estado central y sincronización básica
```typescript
// hooks/core/useFlowState.ts
export const useFlowState = (initialFlow) => {
  // Estado unificado
  // Sincronización ReactFlow <-> Domain
  // Referencias básicas
  // Getters/setters inmutables
}
```

### Módulo 2: `usePositionManagement.ts` (~150-200 líneas)
**Responsabilidad**: Gestión de posiciones y persistencia
```typescript
// hooks/position/usePositionManagement.ts
export const usePositionManagement = (flowState) => {
  // PositionPersistenceService
  // Validación de posiciones
  // Cache de posiciones
  // Detección de cambios estructurales
}
```

### Módulo 3: `useNodeEventHandlers.ts` (~150-200 líneas)
**Responsabilidad**: Manejo de eventos de nodos
```typescript
// hooks/events/useNodeEventHandlers.ts
export const useNodeEventHandlers = (flowState, positionMgmt) => {
  // handleNodesChange (filtrado selectivo)
  // Interceptor nuclear -> validador selectivo
  // Detección de nodos fantasma
  // Logging optimizado
}
```

### Módulo 4: `useEdgeEventHandlers.ts` (~100-150 líneas)
**Responsabilidad**: Manejo de eventos de conexiones
```typescript
// hooks/events/useEdgeEventHandlers.ts
export const useEdgeEventHandlers = (flowState) => {
  // handleEdgesChange
  // onConnect, onConnectStart, onConnectEnd
  // Integración con useConnectionValidation
}
```

### Módulo 5: `useDragDropHandlers.ts` (~150-200 líneas)
**Responsabilidad**: Drag & Drop de nuevos nodos
```typescript
// hooks/dragdrop/useDragDropHandlers.ts
export const useDragDropHandlers = (flowState, positionMgmt) => {
  // onDrop
  // onDragOver
  // Estrategias de obtención de datos
  // Posicionamiento automático
}
```

### Módulo 6: `useFlowUtilities.ts` (~100-150 líneas)
**Responsabilidad**: Utilidades y helpers
```typescript
// hooks/utils/useFlowUtilities.ts
export const useFlowUtilities = (flowState) => {
  // getSelectedNode
  // getNodeTypeConfig
  // isValidConnection
  // getConnectionHelp
  // clearPersistedPositions
}
```

### Módulo 7: `useViewportManagement.ts` (~100-150 líneas)
**Responsabilidad**: Gestión de viewport
```typescript
// hooks/viewport/useViewportManagement.ts
export const useViewportManagement = () => {
  // ViewportPersistenceService
  // saveCurrentViewport
  // clearPersistedViewport
  // getViewportStats
  // hasPersistedViewport
}
```

### Módulo 8: `useDataTransformers.ts` (~100-150 líneas)
**Responsabilidad**: Transformación de datos
```typescript
// hooks/data/useDataTransformers.ts
export const useDataTransformers = (flowState) => {
  // initialNodes transformation
  // initialEdges transformation
  // Domain <-> ReactFlow conversions
  // Memoized selectors
}
```

## 🔗 Hook Principal Simplificado: `useFlowDesigner.ts` (~150-200 líneas)

```typescript
// hooks/useFlowDesigner.ts - VERSIÓN SIMPLIFICADA
export const useFlowDesigner = (initialFlow) => {
  // Componer todos los hooks especializados
  const flowState = useFlowState(initialFlow);
  const positionMgmt = usePositionManagement(flowState);
  const nodeHandlers = useNodeEventHandlers(flowState, positionMgmt);
  const edgeHandlers = useEdgeEventHandlers(flowState);
  const dragDropHandlers = useDragDropHandlers(flowState, positionMgmt);
  const utilities = useFlowUtilities(flowState);
  const viewportMgmt = useViewportManagement();
  const dataTransformers = useDataTransformers(flowState);
  
  // Retornar API unificada
  return {
    // Estado
    nodes: dataTransformers.nodes,
    edges: dataTransformers.edges,
    selectedNode: utilities.selectedNode,
    isLoading: flowState.isLoading,
    error: flowState.error,
    
    // Event Handlers
    onNodesChange: nodeHandlers.handleNodesChange,
    onEdgesChange: edgeHandlers.handleEdgesChange,
    onConnect: edgeHandlers.onConnect,
    onConnectStart: edgeHandlers.onConnectStart,
    onConnectEnd: edgeHandlers.onConnectEnd,
    onDrop: dragDropHandlers.onDrop,
    onDragOver: dragDropHandlers.onDragOver,
    
    // Utilities
    isValidConnection: utilities.isValidConnection,
    getNodeTypeConfig: utilities.getNodeTypeConfig,
    getPersistenceStats: positionMgmt.getPersistenceStats,
    clearPersistedPositions: positionMgmt.clearPersistedPositions,
    getConnectionHelp: utilities.getConnectionHelp,
    
    // Viewport
    saveCurrentViewport: viewportMgmt.saveCurrentViewport,
    getViewportStats: viewportMgmt.getViewportStats,
    clearPersistedViewport: viewportMgmt.clearPersistedViewport,
    hasPersistedViewport: viewportMgmt.hasPersistedViewport,
    
    // Actions
    addNode: flowState.addNode,
    updateNode: flowState.updateNode,
    removeNode: flowState.removeNode,
    selectNode: flowState.selectNode,
    createFlow: flowState.createFlow,
    moveNode: flowState.moveNode
  };
};
```

## 🚀 Cronograma de Implementación

### **Fase 0.1: Preparación (1 día)**
- [ ] Crear estructura de carpetas modular
- [ ] Setup de feature flags para descomposición gradual
- [ ] Backup del código actual

### **Fase 0.2: Módulos de Estado y Posición (1-2 días)**
- [ ] Extraer `useFlowState.ts`
- [ ] Extraer `usePositionManagement.ts`
- [ ] Pruebas unitarias básicas

### **Fase 0.3: Módulos de Event Handlers (1-2 días)**
- [ ] Extraer `useNodeEventHandlers.ts`
- [ ] Extraer `useEdgeEventHandlers.ts`
- [ ] Validar que el interceptor nuclear funciona igual

### **Fase 0.4: Módulos de Utilidades (1 día)**
- [ ] Extraer `useDragDropHandlers.ts`
- [ ] Extraer `useFlowUtilities.ts`
- [ ] Extraer `useViewportManagement.ts`
- [ ] Extraer `useDataTransformers.ts`

### **Fase 0.5: Integración y Hook Principal (1 día)**
- [ ] Crear `useFlowDesigner.ts` simplificado
- [ ] Pruebas de integración completas
- [ ] Activar feature flag gradualmente

## ✅ Beneficios de Esta Descomposición

### **Beneficios Inmediatos**
1. **Mantenibilidad**: Cada módulo tiene una responsabilidad clara
2. **Testing**: Pruebas unitarias granulares
3. **Desarrollo Paralelo**: Equipo puede trabajar en módulos diferentes
4. **Debugging**: Problemas más fáciles de localizar

### **Beneficios para el Rediseño Posterior**
1. **Migración Gradual**: Un módulo a la vez
2. **Menor Riesgo**: Cambios más pequeños y controlados
3. **Mejor Comprensión**: Responsabilidades claramente separadas
4. **Rollback Granular**: Poder retroceder módulo específico

## 🔄 Integración con el Plan Estratégico

### **Después de la Descomposición**
1. **Fase 1 Simplificada**: Migrar estado en `useFlowState.ts`
2. **Fase 2 Modular**: Reemplazar interceptor nuclear en `useNodeEventHandlers.ts`
3. **Fase 3 Optimizada**: Mejorar persistencia en `usePositionManagement.ts`
4. **Fase 4 Granular**: Pruebas por módulo

## 📊 Métricas de Éxito de la Descomposición

### **Métricas de Calidad**
- [ ] Ningún módulo > 200 líneas
- [ ] Responsabilidad única por módulo
- [ ] Cobertura de pruebas > 80% por módulo
- [ ] Dependencias circulares = 0

### **Métricas de Funcionalidad**
- [ ] Funcionalidad 100% preservada
- [ ] Performance igual o mejor
- [ ] No regresiones en tests existentes

## 🎯 Decisión Recomendada

**EMPEZAR CON FASE 0** (Descomposición) porque:

✅ **Reduce riesgo general del proyecto**
✅ **Facilita el trabajo en paralelo** 
✅ **Mejor testing granular**
✅ **Prepara terreno para rediseño estratégico**
✅ **Beneficios inmediatos** sin esperar rediseño completo

¿Procedes con esta descomposición modular antes del rediseño estratégico?
