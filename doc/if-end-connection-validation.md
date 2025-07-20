# Mejora de Validación de Conexiones IF-END

## Descripción del Problema

Se identificó un caso crítico donde el sistema permitía que un nodo de tipo IF conectara ambos handlers ('true' y 'false') al mismo nodo END. Esta situación crea un flujo lógicamente incorrecto, ya que significa que el flujo siempre terminaría en el mismo punto final, independientemente del resultado de la condición IF.

## Solución Implementada

Se ha añadido una regla de validación adicional que previene específicamente este caso:

> **Regla 9**: Un nodo IF no puede conectar ambos handlers ('true' y 'false') al mismo nodo END.

Esta regla garantiza que las bifurcaciones creadas por nodos IF tengan sentido lógico, manteniendo rutas diferenciadas según el resultado de la condición.

## Detalles de Implementación

La implementación se realizó en el archivo `src/presentation/hooks/useConnectionValidation.ts`, modificando la función `isConnectionValid` para añadir esta comprobación específica:

```typescript
// REGLA 8: Un nodo IF no puede conectar ambos handlers (true y false) al mismo nodo END
if (sourceNode.type === 'if' && targetNode.type === 'end') {
  // Identificar el handler que está intentando conectar
  const currentHandleId = sourceHandle || 'default';
  
  // Buscar si ya existe una conexión desde otro handler del mismo nodo IF hacia este END
  const existingIfConnections = edges.filter(e => 
    getSourceId(e) === sourceId && // Mismo nodo IF origen
    getTargetId(e) === targetId && // Mismo nodo END destino
    (e.sourceHandle || 'default') !== currentHandleId // Diferente handler
  );
  
  if (existingIfConnections.length > 0) {
    console.error('❌ El nodo IF ya tiene una conexión hacia este nodo END desde otro handler');
    const message = "Un nodo IF no puede conectar ambos handlers (Sí/No) al mismo nodo END";
    showConnectionError(message);
    return { valid: false, message };
  }
}
```

## Beneficios

1. **Mejora en la integridad lógica**: Garantiza que las bifurcaciones creadas por nodos IF tengan propósitos diferenciados
2. **Prevención de flujos ilógicos**: Evita crear flujos donde la condición IF no tiene efecto real en el resultado
3. **Feedback claro al usuario**: Proporciona un mensaje específico que explica por qué no se permite la conexión
4. **Mejor experiencia de usuario**: Evita confusiones al diseñar flujos complejos

## Pruebas Realizadas

Se probó la solución con los siguientes casos:

1. **Caso normal**: Conectar un handler 'true' de un nodo IF a un nodo END (permitido)
2. **Caso normal**: Conectar un handler 'false' de un nodo IF a un nodo END (permitido)
3. **Caso de error**: Intentar conectar el segundo handler de un nodo IF al mismo nodo END (ahora bloqueado)
4. **Flujo complejo**: Verificar que múltiples nodos IF pueden conectarse al mismo nodo END si son nodos IF diferentes

## Documentación Actualizada

Se han actualizado los siguientes documentos para reflejar esta nueva regla:

1. `doc/connection-validation-system.md`: Añadida la Regla 9 y actualizado el historial de versiones
