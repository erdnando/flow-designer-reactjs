import { v4 as uuidv4 } from 'uuid';
import type { FlowProps } from '../../shared/types';
import { Node } from './Node';
import { Connection } from './Connection';

export class Flow {
  public readonly id: string;
  public name: string;
  public description: string;
  public nodes: Node[];
  public connections: Connection[];
  public status: 'active' | 'inactive' | 'draft';
  public owner: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor({
    id,
    name,
    description = '',
    nodes = [],
    connections = [],
    status = 'draft',
    owner = ''
  }: FlowProps) {
    this.id = id ?? uuidv4();
    this.name = name;
    this.description = description;
    this.nodes = nodes.map(nodeProps => nodeProps instanceof Node ? nodeProps : new Node(nodeProps));
    this.connections = connections.map(connProps => connProps instanceof Connection ? connProps : new Connection(connProps));
    this.status = status;
    this.owner = owner;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addNode(node: Node): Flow {
    this.nodes.push(node);
    this.updatedAt = new Date();
    return this;
  }

  removeNode(nodeId: string): Flow {
    this.nodes = this.nodes.filter(node => node.id !== nodeId);
    // También remover las conexiones relacionadas
    this.connections = this.connections.filter(
      conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    );
    this.updatedAt = new Date();
    return this;
  }

  updateNode(nodeId: string, updates: Partial<Node>): Flow {
    const nodeIndex = this.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex !== -1) {
      Object.assign(this.nodes[nodeIndex], updates);
      this.nodes[nodeIndex].updatedAt = new Date();
      this.updatedAt = new Date();
    }
    return this;
  }

  addConnection(connection: Connection): Flow {
    console.log('🔧 Flow.addConnection called with connection:', connection);

    // Verificar si ya existe una conexión con el mismo ID
    const existingIndex = this.connections.findIndex(c => c.id === connection.id);
    if (existingIndex !== -1) {
      console.log('⚠️ Connection with this ID already exists, replacing it');
      this.connections[existingIndex] = connection;
    } else {
      // Verificar si ya existe una conexión entre los mismos nodos y handles
      const existingConnection = this.connections.find(
        c => c.sourceNodeId === connection.sourceNodeId &&
             c.targetNodeId === connection.targetNodeId &&
             c.sourceHandle === connection.sourceHandle &&
             c.targetHandle === connection.targetHandle
      );
      
      if (existingConnection) {
        console.log('⚠️ Similar connection already exists, ignoring');
        return this;
      }
      
      console.log('✅ Adding new connection to flow');
      this.connections.push(connection);
    }
    
    this.updatedAt = new Date();
    return this;
  }

  removeConnection(connectionId: string): Flow {
    this.connections = this.connections.filter(conn => conn.id !== connectionId);
    this.updatedAt = new Date();
    return this;
  }

  getSelectedNodes(): Node[] {
    return this.nodes.filter(node => node.selected);
  }

  getSelectedConnections(): Connection[] {
    return this.connections.filter(conn => conn.selected);
  }

  clearSelection(): Flow {
    this.nodes.forEach(node => node.deselect());
    this.connections.forEach(conn => conn.deselect());
    return this;
  }

  selectNode(nodeId: string): Flow {
    this.clearSelection();
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.select();
    }
    return this;
  }

  clone(): Flow {
    console.log('🔄 Flow.clone called for flow:', this.id);
    try {
      // Clone the flow data without circular references
      const simplifiedProps = {
        id: this.id,
        name: this.name,
        description: this.description,
        status: this.status,
        owner: this.owner
      };

      // Create a new flow with the same basic properties
      const clonedFlow = new Flow(simplifiedProps);
      
      // Manually add cloned nodes
      clonedFlow.nodes = this.nodes.map(node => {
        try {
          return new Node({
            id: node.id,
            type: node.type,
            position: { x: node.position?.x || 0, y: node.position?.y || 0 },
            data: node.data ? { ...node.data } : { label: 'Node' },
            selected: node.selected || false
          });
        } catch (nodeError) {
          console.error('❌ Error cloning node:', nodeError);
          return node; // Return the original node as fallback
        }
      });
      
      // Manually add cloned connections
      clonedFlow.connections = this.connections.map(conn => {
        try {
          return new Connection({
            id: conn.id,
            sourceNodeId: conn.sourceNodeId,
            targetNodeId: conn.targetNodeId,
            sourceHandle: conn.sourceHandle,
            targetHandle: conn.targetHandle,
            selected: conn.selected || false,
            style: conn.style ? { ...conn.style } : { stroke: '#ddd' }
          });
        } catch (connError) {
          console.error('❌ Error cloning connection:', connError);
          return conn; // Return the original connection as fallback
        }
      });
      
      // Set creation and update dates
      clonedFlow.updatedAt = new Date();
      (clonedFlow as any).createdAt = new Date(this.createdAt);
      
      console.log('✅ Flow cloned successfully');
      return clonedFlow;
    } catch (error) {
      console.error('❌ Error in Flow.clone:', error);
      console.error('Flow that failed to clone:', JSON.stringify({
        id: this.id,
        name: this.name,
        nodeCount: this.nodes?.length || 0,
        connectionCount: this.connections?.length || 0
      }));
      
      // Create an emergency empty clone
      const emergencyClone = new Flow({
        id: this.id,
        name: this.name + ' (recovery)',
        description: 'Recovered after clone error',
        nodes: [],
        connections: []
      });
      
      return emergencyClone;
    }
  }

  toJSON(): FlowProps & { createdAt: Date; updatedAt: Date } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      nodes: this.nodes.map(node => node.toJSON()),
      connections: this.connections.map(conn => conn.toJSON()),
      status: this.status,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json: FlowProps & { createdAt?: string; updatedAt?: string }): Flow {
    const flow = new Flow(json);
    if (json.createdAt) {
      (flow as any).createdAt = new Date(json.createdAt);
    }
    if (json.updatedAt) {
      flow.updatedAt = new Date(json.updatedAt);
    }
    return flow;
  }
}
