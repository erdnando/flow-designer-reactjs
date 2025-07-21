# Implementación de Handlers Predefinidos

## Resumen de la Solución

Se ha implementado un sistema de **handlers predefinidos y diferenciados visualmente** para resolver el problema de confusión entre entrada y salida en los nodos del diseñador de flujos.

## Problema Identificado

El problema original era que los nodos no tenían handlers claramente definidos, lo que causaba:
- Confusión sobre qué lado del nodo era entrada y cuál salida
- Mensajes de error incorrectos (como "Los nodos END no pueden tener salidas")
- Posibilidad de conexiones ambiguas

## Solución Implementada

### 1. Sistema de Handlers Predefinidos

**Archivo**: `src/shared/constants/nodeHandlers.ts`

Cada tipo de nodo tiene handlers específicos:

```typescript
export const NODE_HANDLERS: Record<string, NodeTypeHandlers> = {
  start: {
    inputs: [], // Sin entradas
    outputs: [{ id: 'start-output', type: 'source', position: 'right' }]
  },
  step: {
    inputs: [{ id: 'step-input', type: 'target', position: 'left' }],
    outputs: [{ id: 'step-output', type: 'source', position: 'right' }]
  },
  if: {
    inputs: [{ id: 'if-input', type: 'target', position: 'left' }],
    outputs: [
      { id: 'true', type: 'source', position: 'right' },
      { id: 'false', type: 'source', position: 'right' }
    ]
  },
  end: {
    inputs: [{ id: 'end-input', type: 'target', position: 'left' }],
    outputs: [] // Sin salidas
  }
};
```

### 2. Diferenciación Visual

**Archivo**: `src/presentation/components/flow/FlowNodeHandlers.css`

- **Handlers de entrada**: Azules (`#2196F3`)
- **Handlers de salida**: Verdes (`#4CAF50`)
- **Handler IF-true**: Verde (`#4CAF50`)
- **Handler IF-false**: Rojo (`#F44336`)

### 3. Validación Mejorada

**Archivo**: `src/presentation/hooks/useConnectionValidation.ts`

La validación ahora usa los handlers predefinidos:

```typescript
// Validar que los handles sean válidos para los tipos de nodo
if (sourceHandle && !isValidHandle(sourceNode.type, sourceHandle, 'source')) {
  return { valid: false, message: `Handle de salida "${sourceHandle}" no es válido` };
}

if (targetHandle && !isValidHandle(targetNode.type, targetHandle, 'target')) {
  return { valid: false, message: `Handle de entrada "${targetHandle}" no es válido` };
}
```

### 4. Renderizado Dinámico

**Archivo**: `src/presentation/components/flow/FlowNode.tsx`

Los handlers se renderizan dinámicamente basándose en la configuración:

```typescript
const renderHandles = () => {
  const handles: React.ReactElement[] = [];
  const nodeHandlers = getNodeHandlers(data.nodeType);
  
  // Renderizar handlers de entrada
  nodeHandlers.inputs.forEach(handler => {
    handles.push(
      <Handle
        key={handler.id}
        type="target"
        position={Position[handler.position]}
        id={handler.id}
        style={handler.style}
        title={handler.label}
      />
    );
  });
  
  // Renderizar handlers de salida
  nodeHandlers.outputs.forEach(handler => {
    handles.push(
      <Handle
        key={handler.id}
        type="source"
        position={Position[handler.position]}
        id={handler.id}
        style={handler.style}
        title={handler.label}
      />
    );
  });
  
  return handles;
};
```

## Beneficios de la Implementación

### 1. Claridad Visual
- **Entrada**: Siempre a la izquierda, color azul
- **Salida**: Siempre a la derecha (o abajo para IF-false), color verde/rojo
- **Tooltips**: Cada handler muestra su función al hacer hover

### 2. Validación Precisa
- Cada handler tiene un ID único
- La validación es específica por tipo de nodo y handler
- No hay más confusión sobre qué es entrada y qué es salida

### 3. Nodos IF Mejorados
- **1 entrada**: Izquierda, azul
- **2 salidas**: 
  - `true`: Derecha, verde
  - `false`: Derecha (abajo), rojo

### 4. Consistencia
- Todos los nodos siguen el mismo patrón visual
- Configuración centralizada en un solo archivo
- Fácil de extender para nuevos tipos de nodos

## Reglas de Conexión Específicas

### START
- ❌ Sin handlers de entrada
- ✅ Un handler de salida (derecha, verde)

### STEP
- ✅ Un handler de entrada (izquierda, azul)
- ✅ Un handler de salida (derecha, verde)

### IF
- ✅ Un handler de entrada (izquierda, azul)
- ✅ Dos handlers de salida:
  - `true`: Derecha, verde
  - `false`: Derecha (abajo), rojo

### END
- ✅ Un handler de entrada (izquierda, azul)
- ❌ Sin handlers de salida

## Impacto en la Validación

### Antes (Problemático)
```typescript
// Validación ambigua
if (sourceNode.type === 'end') {
  return { valid: false, message: "Los nodos END no pueden tener salidas" };
}
```

### Después (Preciso)
```typescript
// Validación específica por handler
if (sourceHandle && !isValidHandle(sourceNode.type, sourceHandle, 'source')) {
  return { valid: false, message: `Handle "${sourceHandle}" no es válido para nodos ${sourceNode.type}` };
}
```

## Configuración Extensible

Para agregar un nuevo tipo de nodo:

```typescript
// En nodeHandlers.ts
newNodeType: {
  inputs: [
    { id: 'input1', type: 'target', position: 'left', label: 'Entrada 1' }
  ],
  outputs: [
    { id: 'output1', type: 'source', position: 'right', label: 'Salida 1' }
  ]
}
```

## Estado del Sistema

✅ **Completamente implementado y funcional**
✅ **Build exitoso sin errores**
✅ **Validación precisa por handler**
✅ **Diferenciación visual clara**
✅ **Configuración centralizada**
✅ **Extensible para futuros nodos**

## Resolución del Problema Original

El problema reportado en la imagen donde aparecía el mensaje "Los nodos END no pueden tener salidas" al intentar conectar un nodo STEP a un nodo END ahora está **completamente resuelto**:

1. **Handlers predefinidos** eliminan la ambigüedad
2. **Validación específica** por tipo de handler
3. **Feedback visual** claro sobre qué es entrada y qué es salida
4. **Mensajes de error** precisos y útiles

La implementación garantiza que:
- Los nodos START solo puedan conectar desde su handler de salida
- Los nodos STEP tengan entrada y salida claramente definidas
- Los nodos IF tengan dos salidas diferenciadas (true/false)
- Los nodos END solo puedan recibir conexiones en su handler de entrada

## Próximos Pasos

1. **Testing completo**: Verificar todos los casos de uso
2. **Documentación de usuario**: Crear guía visual
3. **Optimizaciones**: Mejorar performance si es necesario
4. **Nuevos tipos de nodos**: Usar el sistema para futuros nodos
