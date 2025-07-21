# Sistema de Handlers y Conexiones - Flow Designer

## Introducción

Este documento explica el funcionamiento del sistema de handlers y conexiones en el Flow Designer, así como la resolución de un problema crítico de renderización que afectaba la visualización inmediata de conexiones entre nodos.

## Arquitectura del Sistema de Conexiones

### 1. Flujo de Datos

```
Usuario conecta nodos → onConnect → FlowContext → FlowService → Dominio → UI
```

### 2. Componentes Principales

#### **FlowCanvas.tsx**
- Componente ReactFlow principal
- Maneja eventos de conexión (`onConnect`, `onConnectStart`, `onConnectEnd`)
- Renderiza nodos y edges

#### **useFlowDesigner.ts**
- Hook principal que gestiona la sincronización entre dominio y UI
- Convierte entidades del dominio (`Connection`) a edges de ReactFlow (`FlowEdge`)
- Maneja la sincronización de estados

#### **FlowContext.tsx**
- Contexto que encapsula las operaciones del dominio
- Proporciona acciones como `addConnection`, `removeConnection`
- Maneja el estado global del flujo

#### **FlowService.ts**
- Servicio de aplicación que coordina operaciones
- Valida reglas de negocio antes de crear conexiones
- Persiste cambios en el repositorio

## Tipos de Handlers

### 1. Handlers de Nodos

#### **Nodo START**
- **Entrada**: ❌ No permitida
- **Salida**: ✅ Un handle de salida (`output`)
- **Restricciones**: No puede recibir conexiones entrantes

#### **Nodo STEP**
- **Entrada**: ✅ Un handle de entrada (`input`)
- **Salida**: ✅ Un handle de salida (`output`)
- **Restricciones**: Una conexión entrante y una saliente

#### **Nodo IF (Condicional)**
- **Entrada**: ✅ Un handle de entrada (`input`)
- **Salida**: ✅ Dos handles de salida (`true`, `false`)
- **Restricciones**: Una conexión entrante, máximo dos salientes

#### **Nodo END**
- **Entrada**: ✅ Un handle de entrada (`input`)
- **Salida**: ❌ No permitida
- **Restricciones**: Puede recibir múltiples conexiones entrantes

### 2. Validación de Conexiones

El sistema utiliza `useConnectionValidation.ts` para validar conexiones:

```typescript
// Reglas invariantes
1. No conexiones circulares (mismo nodo)
2. Nodos END no pueden tener salidas
3. Nodos START no pueden tener entradas
4. Límites de conexiones según tipo de nodo
5. Verificación de handles específicos
```

## Problema Resuelto: Renderización de Conexiones

### Síntomas del Problema

- ❌ Las conexiones no se visualizaban inmediatamente al crearlas
- ❌ Era necesario agregar un tercer nodo para que apareciera la conexión
- ❌ El log mostraba `"Already syncing, skipping edges sync"`

### Causa Raíz

El problema se originaba en el sistema de sincronización de edges en `useFlowDesigner.ts`:

1. **Bloqueo excesivo**: El flag `isSyncingRef.current` bloqueaba toda sincronización
2. **Timing incorrecto**: La sincronización ocurría después de múltiples re-renders
3. **Falta de detección**: No había mecanismo para detectar discrepancias de renderización

### Solución Implementada

#### **1. Arreglo del Bloqueo de Sincronización**

```typescript
// ANTES: Bloqueaba toda sincronización
if (isSyncingRef.current) {
  logger.debug('Already syncing, skipping edges sync');
  return;
}

// DESPUÉS: Solo bloquea si es la misma firma
if (isSyncingRef.current && lastSyncedEdgesRef.current === initialEdgesSignature) {
  logger.debug('Already syncing same edges, skipping');
  return;
}
```

#### **2. Estrategia Agresiva en onConnect**

```typescript
// Múltiples intentos de actualización
setTimeout(() => {
  // Intento 1: Actualización inmediata
  setEdges(currentEdges => [...currentEdges]);
}, 10);

setTimeout(() => {
  // Intento 2: Verificación intermedia
  setEdges(currentEdges => [...currentEdges]);
}, 50);

setTimeout(() => {
  // Intento 3: Verificación final con fallback
  setEdges(currentEdges => {
    if (currentEdges.length === 0 && hasConnections) {
      return initialEdges; // Forzar desde dominio
    }
    return currentEdges;
  });
}, 100);
```

#### **3. Detector de Discrepancias**

```typescript
useEffect(() => {
  const domainConnections = state.currentFlow?.connections?.length || 0;
  const renderedEdges = edges.length;
  
  if (domainConnections > renderedEdges) {
    // Forzar actualización inmediata
    setEdges(initialEdges);
  }
}, [state.currentFlow, edges.length, initialEdges]);
```

## Consideraciones para Futuras Modificaciones

### ⚠️ Puntos Críticos a Preservar

1. **No modificar el orden de los useEffect** en `useFlowDesigner.ts`
2. **Mantener la estrategia de múltiples intentos** en `onConnect`
3. **Conservar el detector de discrepancias** entre dominio y UI
4. **No agregar bloqueos adicionales** sin considerar el impacto en la renderización

### ✅ Buenas Prácticas

1. **Logging detallado**: Mantener logs para debugging
2. **Validaciones tempranas**: Validar conexiones antes de crear
3. **Consistencia dominio-UI**: Asegurar sincronización inmediata
4. **Timeouts escalonados**: Usar delays progresivos para actualizaciones

### 🔧 Modificaciones Seguras

#### **Para agregar nuevos tipos de nodos:**
1. Actualizar `NodeType.ts` con el nuevo tipo
2. Agregar validaciones en `useConnectionValidation.ts`
3. Definir handlers en el componente del nodo
4. Actualizar documentación

#### **Para modificar reglas de conexión:**
1. Actualizar `isConnectionValid` en `useConnectionValidation.ts`
2. Mantener consistencia con `isValidConnectionPoint`
3. Agregar tests para nuevas reglas
4. Documentar cambios

## Debugging y Monitoreo

### Logs Importantes

```typescript
// Detección de conexiones
logger.debug('⚡ onConnect called with params:', params);

// Sincronización de edges
logger.debug('Syncing edges with state...');

// Detección de discrepancias
logger.warn('🔍 DETECCIÓN DE RENDERIZACIÓN: X conexiones vs Y edges');
```

### Puntos de Verificación

1. **Consola del navegador**: Verificar logs de sincronización
2. **ReactFlow DevTools**: Inspeccionar estado de edges
3. **Estado del dominio**: Verificar `currentFlow.connections`
4. **Handles de nodos**: Verificar atributos `data-handleid`

## Conclusión

El sistema de handlers y conexiones está diseñado para ser robusto y auto-recuperativo. Las correcciones implementadas aseguran que:

- Las conexiones se rendericen inmediatamente
- El sistema detecte y corrija problemas automáticamente
- La experiencia del usuario sea fluida y sin delays

**Recuerda**: Cualquier modificación que afecte la sincronización entre dominio y UI debe considerar estos mecanismos para evitar regresiones en la funcionalidad.

---

*Documento creado: Julio 16, 2025*  
*Última actualización: Julio 16, 2025*  
*Versión: 1.0*
