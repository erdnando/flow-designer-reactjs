import type { Flow } from '../entities/Flow';
import type { Node } from '../entities/Node';
import type { Connection } from '../entities/Connection';
import type { FlowProps } from '../../shared/types';

export interface FlowRepository {
  // Flow operations
  createFlow(flowData: Omit<FlowProps, 'id'>): Promise<Flow>;
  saveFlow(flow: Flow): Promise<Flow>;
  getFlowById(id: string): Promise<Flow | null>;
  getAllFlows(): Promise<Flow[]>;
  deleteFlow(id: string): Promise<boolean>;
  
  // Node operations
  addNodeToFlow(flowId: string, node: Node): Promise<Flow>;
  updateNode(flowId: string, nodeId: string, updates: Partial<Node>): Promise<Flow>;
  removeNodeFromFlow(flowId: string, nodeId: string): Promise<Flow>;
  
  // Connection operations
  addConnectionToFlow(flowId: string, connection: Connection): Promise<Flow>;
  removeConnectionFromFlow(flowId: string, connectionId: string): Promise<Flow>;
  
  // Selection operations
  selectNode(flowId: string, nodeId: string): Promise<Flow>;
  clearSelection(flowId: string): Promise<Flow>;
}
