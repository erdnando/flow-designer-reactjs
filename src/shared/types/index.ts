import type { Node as ReactFlowNode } from 'reactflow';

export interface Position {
  x: number;
  y: number;
}

export interface ConditionalConfig {
  conditionType?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
  conditionValue?: string;
}

export interface CustomConfig {
  customAction?: string;
  parameters?: string;
}

export interface NodeData {
  label?: string;
  description?: string;
  config?: Record<string, any> & ConditionalConfig & CustomConfig;
  icon?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
}

export interface ConnectionStyle {
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
}

export type NodeType = 'start' | 'step' | 'if' | 'end';

export type HandleType = 'input' | 'output';

export interface NodeProps {
  id?: string;
  type: NodeType;
  position?: Position;
  data?: NodeData;
  selected?: boolean;
}

export interface ConnectionProps {
  id?: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  selected?: boolean;
  style?: ConnectionStyle;
}

export interface FlowProps {
  id?: string;
  name: string;
  description?: string;
  nodes?: NodeProps[];
  connections?: ConnectionProps[];
  status?: 'active' | 'inactive' | 'draft';
  owner?: string;
}

// Tipos específicos para React Flow
export interface FlowNode extends ReactFlowNode {
  type: NodeType;
  data: NodeData & {
    nodeType: NodeType;
    onNodeClick?: (nodeId: string) => void;
    onNodeDelete?: (nodeId: string) => void;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'smoothstep' | 'straight' | 'step' | 'bezier' | 'smoothbezier';
  animated?: boolean;
  style?: Record<string, any>;
  data?: {
    connectionId?: string;
    [key: string]: any;
  };
}

// Tipos para Drag & Drop
export interface DragItem {
  type: string;
  nodeType: NodeType;
}

export interface DropResult {
  position: Position;
}

// Configuración de nodos
export interface NodeTypeConfig {
  label: string;
  description: string;
  color: string;
  icon: string;
  allowedInputs: number;
  allowedOutputs: number;
  shape: 'circle' | 'rectangle' | 'diamond';
}
