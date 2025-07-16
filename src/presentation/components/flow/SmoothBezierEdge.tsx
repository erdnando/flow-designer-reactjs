import React from 'react';
import { getBezierPath, EdgeProps, Position } from 'reactflow';
import './BezierEdge.css';
import './SmoothBezierEdge.css';

// Este componente es un edge personalizado que usa curvas de Bezier más suaves
export default function SmoothBezierEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  markerEnd,
}: EdgeProps) {
  // Aumentamos significativamente la curvatura para hacer las conexiones muy curvas
  const curvature = 0.95;
  
  // Ajustar posiciones para asegurar curvas más suaves
  // Creamos un offset para evitar líneas rectas o casi rectas
  const sourceYOffset = sourcePosition === Position.Bottom ? sourceY + 50 : sourceY;
  const targetYOffset = targetPosition === Position.Top ? targetY - 50 : targetY;
  
  // Usamos getBezierPath de ReactFlow para generar el path SVG con mayor curvatura
  const [path] = getBezierPath({
    sourceX,
    sourceY: sourceYOffset,
    sourcePosition,
    targetX,
    targetY: targetYOffset,
    targetPosition,
    curvature,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path smooth-bezier-path"
      d={path}
      style={{
        strokeWidth: 2,
        stroke: '#b1b1b7',
        ...style,
      }}
      markerEnd={markerEnd}
    />
  );
}
