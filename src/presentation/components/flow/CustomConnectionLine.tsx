import React from 'react';
import { getBezierPath } from 'reactflow';
import './SmoothBezierEdge.css';

// Este componente personaliza la línea de conexión durante el arrastre
export default function CustomConnectionLine({
  fromX,
  fromY,
  fromPosition,
  toX,
  toY,
  toPosition,
  connectionLineStyle,
}: {
  fromX: number;
  fromY: number;
  fromPosition: any;
  toX: number;
  toY: number;
  toPosition: any;
  connectionLineStyle?: any;
}) {
  // Usar una curvatura extremadamente alta para asegurar que sea curva durante el arrastre
  const curvature = 1.0; // Máxima curvatura posible
  
  // Aplicar offsets más agresivos para forzar que la conexión sea curva incluso en líneas cortas
  let fromYOffset = fromY;
  let toYOffset = toY;
  
  // Basado en la posición de origen y destino, aplicamos diferentes offsets
  if (fromPosition === 'bottom') {
    fromYOffset = fromY + 100; // Offset más grande
  } else if (fromPosition === 'top') {
    fromYOffset = fromY - 100;
  } else if (fromPosition === 'left') {
    fromYOffset = fromY;
  } else if (fromPosition === 'right') {
    fromYOffset = fromY;
  }
  
  if (toPosition === 'top') {
    toYOffset = toY - 100; // Offset más grande
  } else if (toPosition === 'bottom') {
    toYOffset = toY + 100;
  } else if (toPosition === 'left') {
    toYOffset = toY;
  } else if (toPosition === 'right') {
    toYOffset = toY;
  }
  
  // Obtener el path de la curva Bezier con alta curvatura
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromYOffset,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toYOffset,
    targetPosition: toPosition,
    curvature,
  });

  return (
    <path
      d={path}
      className="react-flow__connection-path smooth-bezier-connection-path"
      style={{
        ...connectionLineStyle,
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        fill: 'none'
      }}
    />
  );
}
