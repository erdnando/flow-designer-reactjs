import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  ConnectionMode,
  ConnectionLineType,
  useReactFlow,
  Panel
} from 'reactflow';
import { setupDragDropDebugging } from "../../../shared/utils/dragDropDebugger";
import 'reactflow/dist/style.css';

import FlowNode from './FlowNode';
import BezierEdge from './BezierEdge';
import SmoothBezierEdge from './SmoothBezierEdge';
import CustomConnectionLine from './CustomConnectionLine';
import { useFlowDesigner } from '../../hooks/useFlowDesigner';
import { CANVAS_CONFIG } from '../../../shared/constants';
import './FlowCanvas.css';
import './custom-marker.css';
import './BezierEdge.css';  // Importamos el CSS para los edges curvos
import './SmoothBezierEdge.css'; // CSS para nuestro nuevo componente con curvas más suaves
import './ForceEdgeCurves.css';  // CSS para forzar curvas en todas las conexiones
import './DragConnectionStyles.css'; // CSS específico para mejorar las líneas durante el arrastre
// Importar estilos específicos para prevenir imagen fantasma
import './NoGhostImage.css';
// Importar estilos para drag and drop
import '../ui/DragDropStyles.css';
import './DragDropCanvas.css';

// Definir tipos de nodos personalizados
const nodeTypes: NodeTypes = {
  start: FlowNode,
  step: FlowNode,
  if: FlowNode,
  end: FlowNode
};

// Definir tipos de bordes personalizados
const edgeTypes: Record<string, React.ComponentType<any>> = {
  bezier: BezierEdge, // Componente original para curvas
  smoothbezier: SmoothBezierEdge // Nuestro nuevo componente con curvas más suaves
};

interface FlowCanvasProps {
  className?: string;
}

const FlowCanvas: React.FC<FlowCanvasProps> = ({ className }) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onDrop,
    onDragOver,
    isLoading,
    selectNode
  } = useFlowDesigner();

  const { fitView } = useReactFlow();
  
  // Configurar las utilidades de depuración de drag & drop
  useEffect(() => {
    // Activar solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      setupDragDropDebugging();
    }
  }, []);

  // Controlador para seleccionar nodo al hacer clic
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Asegurar la selección explícita del nodo
    selectNode(node.id);
  }, [selectNode]);

  const handlePaneClick = useCallback(() => {
    // Deseleccionar nodos al hacer click en el canvas vacío
    selectNode(null);
  }, [selectNode]);

  const onInit = useCallback(() => {
    // Ajustar vista inicial con zoom personalizado muy alejado
    setTimeout(() => {
      const flow = document.querySelector('.react-flow');
      if (flow) {
        // Primero ajustar la vista y luego aplicar zoom extremo
        fitView({
          minZoom: CANVAS_CONFIG.ZOOM_MIN,
          maxZoom: CANVAS_CONFIG.ZOOM_MAX,
          duration: 0
        });
        
        // Forzar un nivel de zoom aún más alejado después del fitView
        const reactFlowInstance = document.querySelector('.react-flow-viewport');
        if (reactFlowInstance) {
          // @ts-ignore - Aplicar transformación directa para forzar zoom extremo
          reactFlowInstance.style.transform = `translate(0px, 0px) scale(${CANVAS_CONFIG.DEFAULT_ZOOM})`;
        }
      }
    }, 200);
  }, [fitView]);

  if (isLoading) {
    return (
      <div className={`flow-canvas flow-canvas--loading ${className || ''}`}>
        <div className="flow-canvas__loading">
          <div className="flow-canvas__spinner"></div>
          <p>Loading flow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flow-canvas ${className || ''}`}>
      {/* SVG definitions for custom markers */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker 
            id="edgeend" 
            viewBox="0 0 8 8" 
            refX="4" 
            refY="4" 
            markerWidth="8" 
            markerHeight="8" 
            orient="auto">
            <circle cx="4" cy="4" r="3" fill={CANVAS_CONFIG.EDGE_OPTIONS.STYLE.STROKE} />
          </marker>
        </defs>
      </svg>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={handlePaneClick}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Control"
        defaultEdgeOptions={{
          type: 'smoothbezier', // Usar nuestro tipo personalizado con curvas más suaves
          animated: false,
          style: {
            stroke: CANVAS_CONFIG.EDGE_OPTIONS.STYLE.STROKE,
            strokeWidth: CANVAS_CONFIG.EDGE_OPTIONS.STYLE.STROKE_WIDTH,
            strokeDasharray: '' // Sin línea punteada
          },
          // Usar un círculo en vez de una flecha como marcador de fin
          markerEnd: 'url(#edgeend)'
        }}
        // Usar las configuraciones del archivo constants para tener consistencia
        connectionLineStyle={{
          stroke: CANVAS_CONFIG.CONNECTION_LINE.STROKE,
          strokeWidth: CANVAS_CONFIG.CONNECTION_LINE.STROKE_WIDTH,
          strokeDasharray: '', // Forzar línea continua
          // Asegurar que no se muestre el efecto de arrastre del navegador
          pointerEvents: 'none'
        }}
        // Usar nuestro componente personalizado para la línea de conexión durante el arrastre
        connectionLineComponent={CustomConnectionLine}
        snapToGrid={CANVAS_CONFIG.SNAP_GRID}
        snapGrid={[CANVAS_CONFIG.GRID_SIZE, CANVAS_CONFIG.GRID_SIZE]}
        fitView
        attributionPosition="bottom-right"
        proOptions={{
          hideAttribution: true
        }}
        // Configuraciones de zoom y pan
        minZoom={CANVAS_CONFIG.ZOOM_MIN}
        maxZoom={CANVAS_CONFIG.ZOOM_MAX}
        defaultViewport={{ x: 0, y: 0, zoom: CANVAS_CONFIG.DEFAULT_ZOOM }}
      >
        <Background
          variant={"dots" as any}
          gap={CANVAS_CONFIG.GRID_SIZE}
          size={1}
          color="rgba(255, 255, 255, 0.07)"
        />

        <Controls
          position="bottom-left"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
        />

      
         <MiniMap
          position="bottom-right"
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        <Panel position="top-right" className="flow-canvas__info-panel">
          <div className="flow-canvas__stats">
            <span className="flow-canvas__stat">
              📦 {nodes.length} nodes
            </span>
            <span className="flow-canvas__stat">
              🔗 {edges.length} connections
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default FlowCanvas;
