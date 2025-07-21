# Corrección de Centrado de Etiquetas de Nodos

## Problema Identificado
- Las etiquetas de los nodos no estaban centradas correctamente
- Aparecían desplazadas hacia la derecha
- Necesitaban estar más cerca del nodo

## Solución Implementada

### 1. Estructura del Componente
**Problema:** En `FlowNode.new.tsx` la etiqueta estaba dentro del contenido del nodo, causando problemas de centrado.

**Solución:** Movida la etiqueta fuera del contenido del nodo usando el contenedor adecuado:

```tsx
{/* Contenido del nodo */}
{renderNodeContent()}

{/* Etiqueta del nodo */}
<div className="flow-node__label-container">
  <div className="flow-node__label">
    {data.label || nodeConfig.label}
  </div>
</div>
```

### 2. Ajustes en CSS
**Problema:** La etiqueta no estaba suficientemente cerca del nodo.

**Solución:** Reducción de distancia en el CSS:

```css
.flow-node__label-container {
  position: absolute;
  bottom: -5px;    /* Antes: -10px */
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.flow-node--diamond .flow-node__label-container {
  bottom: -10px;   /* Antes: -15px */
}
```

### 3. Limpieza del Código
**Problema:** El label estaba duplicado en el contenido del nodo.

**Solución:** Eliminado el label del `renderNodeContent()` para evitar duplicación:

```tsx
// Antes - dentro del contenido
return (
  <div className="flow-node__content">
    <NodeIcon type={data.nodeType} className="flow-node__icon" />
    <WarningIndicator show={...} warnings={...} />
    <div className="flow-node__label">  // ← Eliminado
      {data.label || nodeConfig.label}
    </div>
  </div>
);

// Después - fuera del contenido
return (
  <div className="flow-node__content">
    <NodeIcon type={data.nodeType} className="flow-node__icon" />
    <WarningIndicator show={...} warnings={...} />
  </div>
);
```

## Archivos Modificados
1. `src/presentation/components/flow/FlowNode.new.tsx`
2. `src/presentation/components/flow/FlowNode.css`

## Resultado
- ✅ Etiquetas perfectamente centradas
- ✅ Más cerca del nodo (5px vs 10px anterior)
- ✅ Consistencia con el archivo principal FlowNode.tsx
- ✅ Compilación exitosa sin errores

## Centrado Técnico
La etiqueta ahora usa correctamente:
- `left: 50%` - Posiciona el borde izquierdo al 50% del nodo
- `transform: translateX(-50%)` - Centra el elemento moviéndolo 50% de su propio ancho hacia la izquierda
- `text-align: center` - Centra el texto dentro de la etiqueta

Esta combinación garantiza un centrado perfecto independientemente del ancho del texto.
