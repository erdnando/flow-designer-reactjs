# Propuesta: Reglas de Conexión para Diseñador de Flujos

## Problema identificado

Actualmente el diseñador permite crear conexiones que conceptualmente podrían ser confusas o inadecuadas para un flujo lógico, como:

- Múltiples conexiones saliendo del mismo handler de un nodo
- Conexiones que no respetan el flujo natural de izquierda a derecha (o de arriba a abajo)
- Inconsistencia visual entre el tipo de nodo y sus puntos de conexión disponibles

## Solución propuesta

Combinamos dos enfoques principales:

1. **Validaciones de conexión estrictas**: Reglas de validación programáticas
2. **Rediseño de handlers por tipo de nodo**: Estructura visual específica según la función de cada nodo

## Parte 1: Validaciones de conexión

### Reglas generales

1. **Regla de dirección**: Las conexiones deben fluir siempre de izquierda a derecha o de arriba a abajo
2. **Regla de unicidad**: Cada punto de conexión de salida solo puede tener una conexión (excepto para nodos tipo `if`)
3. **Regla de tipos compatibles**: Solo ciertos tipos de nodos pueden conectarse entre sí

### Implementación de validaciones

```typescript
// Función para validar si una conexión está permitida
const isConnectionValid = (connection, nodes, edges) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  // Validación 1: No permitir conexiones circulares
  if (connection.source === connection.target) {
    return { valid: false, message: "No se permiten conexiones a sí mismo" };
  }
  
  // Validación 2: Comprobar límites de salida según tipo de nodo
  const existingOutputs = edges.filter(
    e => e.source === connection.source && e.sourceHandle === connection.sourceHandle
  );
  
  if (sourceNode?.data?.nodeType !== 'if' && existingOutputs.length > 0) {
    return { valid: false, message: "Este tipo de nodo solo puede tener una conexión por punto de salida" };
  }
  
  // Validación 3: Comprobar límites de entrada según tipo de nodo
  const existingInputs = edges.filter(
    e => e.target === connection.target && e.targetHandle === connection.targetHandle
  );
  
  if (existingInputs.length > 0) {
    return { valid: false, message: "Este punto de conexión ya tiene una entrada" };
  }
  
  // Validación 4: No permitir conexiones a nodos de inicio
  if (targetNode?.data?.nodeType === 'start') {
    return { valid: false, message: "No se puede conectar a un nodo de inicio" };
  }
  
  return { valid: true };
};
```

## Parte 2: Rediseño de nodos según su tipo

Cada tipo de nodo debe tener una estructura específica que refleje su función en el flujo:

### Nodo START
- **Apariencia**: Redondeado con indicador de inicio
- **Handlers**:
  - Salida: 1 handler en la parte derecha
  - Entrada: Ninguno
- **Reglas específicas**:
  - No puede recibir conexiones entrantes
  - Solo puede conectarse a nodos de tipo `step` o `if`

### Nodo STEP
- **Apariencia**: Rectangular con icono representativo
- **Handlers**:
  - Entrada: 1 handler en la parte izquierda
  - Salida: 1 handler en la parte derecha
- **Reglas específicas**:
  - Solo puede recibir una conexión entrante
  - Solo puede tener una conexión saliente

### Nodo IF (Bifurcación)
- **Apariencia**: Diamante o hexágono con icono de decisión
- **Handlers**:
  - Entrada: 1 handler en la parte superior
  - Salidas: 2 handlers claramente etiquetados
    - "True" (parte derecha)
    - "False" (parte inferior)
- **Reglas específicas**:
  - Solo puede recibir una conexión entrante
  - Puede tener hasta 2 conexiones salientes (una por cada handler)
  - Las salidas deben estar claramente diferenciadas visualmente

### Nodo END
- **Apariencia**: Redondeado con indicador de fin
- **Handlers**:
  - Entrada: 1 handler en la parte izquierda
  - Salida: Ninguna
- **Reglas específicas**:
  - Puede recibir múltiples conexiones entrantes
  - No puede tener conexiones salientes

## Implementación y Retroalimentación

### Feedback Visual

1. **Durante la conexión**:
   - Resaltar en verde los handlers válidos mientras se arrastra una conexión
   - Resaltar en rojo los handlers inválidos
   - Mostrar tooltip con la razón por la que una conexión no está permitida

2. **Validación en tiempo real**:
   - Cuando se intente una conexión no válida, mostrar un mensaje explicativo
   - Animación suave de rechazo cuando una conexión no es válida
   - Sonido sutil de error (opcional, con configuración para desactivarlo)

### Orden de implementación

1. Primero implementar el rediseño de los nodos según su tipo
2. Luego añadir las validaciones de conexión
3. Finalmente incorporar el feedback visual para mejorar la experiencia de usuario

## Beneficios esperados

- **Claridad visual**: El diseño específico de cada nodo comunica su función
- **Prevención de errores**: Las validaciones impiden crear flujos ilógicos
- **Mejor experiencia**: El feedback inmediato ayuda al usuario a entender las reglas
- **Flujos más limpios**: La estructura resultante será más organizada y comprensible

Este enfoque mantiene la flexibilidad necesaria para diseñar flujos complejos mientras impone reglas lógicas que aseguran la creación de flujos válidos y comprensibles.
