# Sistema de Validación de Conexiones

## Descripción General

El sistema de validación de conexiones implementa reglas de negocio para controlar qué tipos de conexiones son válidas entre diferentes tipos de nodos en el diseñador de flujos.

## Arquitectura del Sistema

### 1. Hook de Validación (`useConnectionValidation.ts`)

**Ubicación**: `src/presentation/hooks/useConnectionValidation.ts`

**Funciones Principales**:

- `isConnectionValid(connection, nodes, edges)`: Valida una conexión completa
- `isValidConnectionPoint(nodeId, handleId, handleType, nodes, edges)`: Valida un punto de conexión específico
- `areTypesCompatible(sourceType, targetType)`: Verifica compatibilidad entre tipos de nodos
- `getConnectionHelpMessage(sourceType, targetType, handleType)`: Proporciona mensajes de ayuda

### 2. Integración en el Hook Principal (`useFlowDesigner.ts`)

**Funciones Agregadas**:

- `isValidConnection(connection)`: Wrapper para validación en tiempo real durante el arrastre
- `getConnectionHelp(sourceType, targetType, handleType)`: Wrapper para obtener ayuda sobre conexiones

**Modificaciones en `onConnect`**:

```typescript
// NUEVA VALIDACIÓN: Verificar si la conexión es válida según las reglas de negocio
if (state.currentFlow) {
  const validationResult = isConnectionValid(
    params,
    state.currentFlow.nodes,
    state.currentFlow.connections
  );
  
  if (!validationResult.valid) {
    logger.error('❌ Conexión rechazada por validación:', validationResult.message);
    alert(`Conexión no válida: ${validationResult.message}`);
    return;
  }
}
```

### 3. Integración en el Canvas (`FlowCanvas.tsx`)

**Modificaciones**:

- Importación de `isValidConnection` desde `useFlowDesigner`
- Configuración del prop `isValidConnection` en `ReactFlow`

```tsx
<ReactFlow
  // ... otros props
  isValidConnection={isValidConnection}
  // ... otros props
/>
```

## Reglas de Validación Implementadas

### 1. Prevención de Conexiones Circulares

**Regla**: Un nodo no puede conectarse directamente a sí mismo.

**Implementación**: Verificación de `sourceId === targetId`

### 2. Conexiones Duplicadas

**Regla**: No se permite crear conexiones duplicadas entre los mismos nodos.

**Implementación**: Búsqueda de conexiones existentes con los mismos origen y destino.

### 3. Restricciones de Nodos START

**Regla**: Los nodos START no pueden tener conexiones entrantes.

**Implementación**: Verificación de `targetNode.type === 'start'`

### 4. Restricciones de Nodos END

**Regla**: Los nodos END no pueden tener conexiones salientes.

**Implementación**: Verificación de `sourceNode.type === 'end'`

### 5. Compatibilidad de Tipos

**Matriz de Compatibilidad**:

```typescript
const compatibilityMatrix: Record<string, string[]> = {
  'start': ['step', 'if', 'end'], // START puede conectarse a STEP, IF o END
  'step': ['step', 'if', 'end'],  // STEP puede conectarse a STEP, IF o END
  'if': ['step', 'if', 'end'],    // IF puede conectarse a STEP, IF o END
  'end': []                       // END no puede conectarse a nada
};
```

### 6. Límites de Conexiones Salientes

**Nodos START/STEP**: Solo una conexión saliente por handle
**Nodos IF**: Una conexión saliente por handle ('true' o 'false')
**Nodos END**: No pueden tener conexiones salientes

### 7. Límites de Conexiones Entrantes

**Nodos START**: No pueden tener conexiones entrantes
**Nodos STEP/IF**: Solo una conexión entrante por handle
**Nodos END**: Pueden tener múltiples conexiones entrantes, con restricciones (ver regla 9)

### 8. Validación de Handles de Nodos IF

**Regla**: Los nodos IF solo pueden usar handles 'true' o 'false' para salidas.

**Implementación**: Verificación de `['true', 'false'].includes(sourceHandle)`

### 9. Restricción de Conexión de Nodos IF a END

**Regla**: Un nodo IF no puede conectar ambos handlers ('true' y 'false') al mismo nodo END.

**Implementación**: Cuando se intenta conectar un nodo IF a un nodo END, se verifica si ya existe una conexión desde otro handler del mismo nodo IF hacia ese mismo nodo END.

## Feedback al Usuario

### 1. Validación en Tiempo Real

- **Durante el arrastre**: `isValidConnection` proporciona feedback visual inmediato
- **Puntos de conexión válidos**: Se destacan visualmente
- **Puntos de conexión inválidos**: Se muestran como no disponibles

### 2. Mensajes de Error

- **Conexiones rechazadas**: Alert con mensaje descriptivo
- **Logging detallado**: Información de depuración en consola
- **Mensajes específicos por regla**: Explicaciones claras del por qué la conexión es inválida

### 3. Mensajes de Ayuda

```typescript
// Ejemplo de mensajes por tipo de nodo
const helpMessages = {
  'start': "Los nodos START solo pueden conectarse a STEP, IF o END",
  'step': "Los nodos STEP pueden conectarse a STEP, IF o END",
  'if': "Los nodos IF tienen salidas 'true' y 'false'",
  'end': "Los nodos END pueden recibir múltiples conexiones"
};
```

## Uso del Sistema

### 1. Validación Automática

El sistema funciona automáticamente:

- **Durante el arrastre**: Valida en tiempo real
- **Al crear conexión**: Valida antes de persistir
- **Feedback visual**: Muestra estado de validación

### 2. Integración con Logs

```typescript
// Ejemplo de logging
logger.error('❌ Conexión rechazada por validación:', validationResult.message);
logger.debug('🔍 Validando conexión durante arrastre:', connection);
logger.success('✅ Conexión válida');
```

### 3. Manejo de Errores

```typescript
// Estructura de respuesta de validación
interface ConnectionValidationResult {
  valid: boolean;
  message?: string;
}
```

## Consideraciones Técnicas

### 1. Performance

- **Memoización**: Funciones de validación son memoizadas con `useCallback`
- **Validación lazy**: Solo valida cuando es necesario
- **Caching**: Resultados de validación se cachean automáticamente

### 2. Extensibilidad

- **Reglas configurables**: Fácil agregar nuevas reglas
- **Mensajes personalizables**: Sistema de mensajes flexible
- **Tipos de nodos extensibles**: Soporte para nuevos tipos de nodos

### 3. Testing

El sistema está diseñado para ser fácil de probar:

- **Funciones puras**: Validación sin efectos secundarios
- **Datos mockeables**: Nodos y conexiones son objetos simples
- **Resultados predecibles**: Validación determinística

## Resolución de Problemas

### 1. Conexiones No Válidas

**Problema**: La conexión es rechazada
**Solución**: Verificar logs en consola para mensaje específico

### 2. Feedback Visual Inconsistente

**Problema**: El feedback visual no coincide con la validación
**Solución**: Verificar que `isValidConnection` esté configurado en `ReactFlow`

### 3. Performance Lenta

**Problema**: Validación lenta durante arrastre
**Solución**: Verificar que las dependencias de `useCallback` estén correctas

## Historial de Cambios

### v1.1.0 (Mejora de Validación de Nodos IF)

- ✅ Nueva regla: Un nodo IF no puede conectar ambos handlers ('true' y 'false') al mismo nodo END
- ✅ Mensajes de error mejorados para esta validación
- ✅ Documentación actualizada con la nueva regla

### v1.0.0 (Implementación Inicial)

- ✅ Validación básica de conexiones
- ✅ Reglas de tipos de nodos
- ✅ Prevención de conexiones circulares
- ✅ Límites de conexiones por tipo
- ✅ Feedback visual en tiempo real
- ✅ Mensajes de error descriptivos
- ✅ Integración con sistema de logging

### Próximas Mejoras

- 🔄 Mensajes de ayuda contextuales en UI
- 🔄 Validación visual mejorada
- 🔄 Configuración de reglas por archivo
- 🔄 Testing automatizado
- 🔄 Documentación interactiva
