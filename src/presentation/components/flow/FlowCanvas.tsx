import React, { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  ConnectionMode,
  useReactFlow,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import FlowNode from './FlowNode';
import { useFlowDesigner } from '../../hooks/useFlowDesigner';
import { CANVAS_CONFIG } from '../../../shared/constants';
import './FlowCanvas.css';

// Definir tipos de nodos personalizados
const nodeTypes: NodeTypes = {
  start: FlowNode,
  step: FlowNode,
  if: FlowNode,
  end: FlowNode
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
    onDrop,
    onDragOver,
    isLoading,
    selectNode
  } = useFlowDesigner();

  const { fitView } = useReactFlow();

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={handlePaneClick}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Control"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: 'rgba(148, 163, 184, 0.8)',
            strokeWidth: 2
          }
        }}
        snapToGrid={CANVAS_CONFIG.SNAP_GRID}
        snapGrid={[CANVAS_CONFIG.GRID_SIZE, CANVAS_CONFIG.GRID_SIZE]}
        fitView
        attributionPosition="bottom-right"
        proOptions={{
          hideAttribution: true
        }}
        // Asegurar que los nodos sean arrastrables
        draggable={true}
        // Agregar configuración adicional para el arrastre
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        // Ajustar configuraciones para facilitar la interacción
        preventScrolling={false}
        nodeOrigin={[0.5, 0.5]}
        // Habilitar comportamientos automáticos útiles
        autoPanOnNodeDrag={true}
        autoPanOnConnect={true}
        panOnDrag={true}
        selectionOnDrag={true}
        // Habilitar funcionalidades de navegación
        panOnScroll={true}
        zoomOnPinch={true}
        zoomOnScroll={true}
        zoomOnDoubleClick={true}
        // Configuraciones de zoom y pan
        minZoom={CANVAS_CONFIG.ZOOM_MIN}
        maxZoom={CANVAS_CONFIG.ZOOM_MAX}
        defaultViewport={{ x: 0, y: 0, zoom: CANVAS_CONFIG.DEFAULT_ZOOM }}
        // Evitar que ReactFlow haga ajustes automáticos
        nodeExtent={undefined}
        translateExtent={undefined}
        // Desactivar algoritmos de layout automático
        fitViewOptions={{
          padding: 0.5, // Mayor padding para una vista más alejada
          includeHiddenNodes: false,
          minZoom: CANVAS_CONFIG.ZOOM_MIN,
          maxZoom: CANVAS_CONFIG.ZOOM_MAX,
          duration: 0 // Sin animaciones automáticas
        }}
        // Configuraciones adicionales para evitar movimientos automáticos
        connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
        connectionLineType={'smoothstep' as any}
        // Desactivar cualquier comportamiento de reorganización automática
        onlyRenderVisibleElements={false}
        // Deshabilitar comportamientos internos de ReactFlow
        selectNodesOnDrag={false}
        // Configuraciones de bordes para evitar ajustes automáticos
        edgesFocusable={false}
        edgesUpdatable={false}
      >
        {/* Background con patrón de puntos */}
        <Background
          variant={"dots" as any}
          gap={CANVAS_CONFIG.GRID_SIZE}
          size={1}
          color="rgba(255, 255, 255, 0.07)"
        />

        {/* Controles de zoom y ajuste */}
        <Controls
          position="bottom-left"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        />

        {/* Minimap */}
        <MiniMap
          position="bottom-right"
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#10b981';
              case 'end':
                return '#ef4444';
              case 'conditional':
                return '#f59e0b';
              case 'custom':
                return '#8b5cf6';
              default:
                return '#6b7280';
            }
          }}
        />

        {/* Panel de información */}
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
