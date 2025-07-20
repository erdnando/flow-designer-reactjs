import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import type { Flow } from '../../domain/entities/Flow';
import { Flow as FlowImpl } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import type { FlowProps, NodeProps, ConnectionProps } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../shared/utils';

export class FlowService {
  constructor(private flowRepository: FlowRepository) {
    logger.debug('FlowService constructor called with repository:', flowRepository);
    // Verificar que el repositorio tenga los métodos requeridos
    if (!this.flowRepository) {
      console.error('❌ flowRepository is undefined in FlowService constructor');
      throw new Error('flowRepository is required');
    }
  }

  // Flow operations
  async createFlow(flowData: Omit<FlowProps, 'id'>): Promise<Flow> {
    logger.debug('FlowService.createFlow called with:', flowData);
    try {
      // Crear directamente una nueva instancia de Flow
      const flow = new FlowImpl({
        ...flowData
      });
      logger.success('Flow created:', flow);
      
      // Guardar el flow en el repositorio
      await this.flowRepository.saveFlow(flow);
      logger.success('Flow saved:', flow);
      
      return flow;
    } catch (error) {
      console.error('❌ Error in createFlow:', error);
      throw error;
    }
  }
  
  // This space was for the saveFlow method which is defined later in the file

  async getFlow(id: string): Promise<Flow | null> {
    try {
      logger.debug('FlowService.getFlow called with id:', id);
      return await this.flowRepository.getFlowById(id);
    } catch (error) {
      console.error('❌ Error in getFlow:', error);
      throw error;
    }
  }

  async getAllFlows(): Promise<Flow[]> {
    try {
      logger.debug('FlowService.getAllFlows called');
      return await this.flowRepository.getAllFlows();
    } catch (error) {
      console.error('❌ Error in getAllFlows:', error);
      throw error;
    }
  }

  async deleteFlow(id: string): Promise<boolean> {
    try {
      logger.debug('FlowService.deleteFlow called with id:', id);
      return await this.flowRepository.deleteFlow(id);
    } catch (error) {
      console.error('❌ Error in deleteFlow:', error);
      throw error;
    }
  }

  // Node operations
  async addNode(flowId: string, nodeData: Omit<NodeProps, 'id'>): Promise<Node> {
    try {
      logger.debug('FlowService.addNode called with:', { flowId, nodeData });
      
      // Obtener el flow
      const flow = await this.flowRepository.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow with id ${flowId} not found`);
      }
      
      // Crear nodo
      const node = new Node({
        ...nodeData
      });
      logger.success('Node created:', node);
      
      // Agregar nodo al flow
      flow.addNode(node);
      logger.success('Node added to flow');
      
      // Guardar flow actualizado
      await this.flowRepository.saveFlow(flow);
      logger.success('Flow updated with new node');
      
      return node;
    } catch (error) {
      console.error('❌ Error in addNode:', error);
      throw error;
    }
  }

  async updateNode(flowId: string, nodeId: string, updates: Partial<NodeProps>): Promise<Node> {
    try {
      logger.debug('FlowService.updateNode called with:', { flowId, nodeId, updates });
      
      // Obtener el flow
      const flow = await this.flowRepository.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow with id ${flowId} not found`);
      }
      
      // Encontrar el nodo
      const node = flow.nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error(`Node with id ${nodeId} not found`);
      }
      
      // Actualizar propiedades del nodo
      if (updates.position) {
        // Usar el método updatePosition del nodo para actualizar la posición
        node.updatePosition(updates.position);
        logger.success('Node position updated to:', node.position);
      }
      
      if (updates.data) {
        // Usar el método updateData del nodo para actualizar los datos
        node.updateData(updates.data);
        logger.success('Node data updated');
      }
      
      if (updates.type) {
        node.type = updates.type;
        node.updatedAt = new Date();
        console.log('✅ Node type updated to:', node.type);
      }
      
      if (updates.selected !== undefined) {
        updates.selected ? node.select() : node.deselect();
        console.log('✅ Node selection updated to:', node.selected);
      }
      
      // Guardar el flow actualizado
      await this.flowRepository.saveFlow(flow);
      console.log('✅ Flow saved with updated node');
      
      return node;
    } catch (error) {
      console.error('❌ Error in updateNode:', error);
      throw error;
    }
  }

  async removeNode(flowId: string, nodeId: string): Promise<Flow> {
    try {
      console.log('🔧 FlowService.removeNode called with:', { flowId, nodeId });
      
      // Obtener el flow
      const flow = await this.flowRepository.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow with id ${flowId} not found`);
      }
      
      // Eliminar nodo
      flow.removeNode(nodeId);
      
      // Guardar flow actualizado
      await this.flowRepository.saveFlow(flow);
      
      return flow;
    } catch (error) {
      console.error('❌ Error in removeNode:', error);
      throw error;
    }
  }

  async moveNode(flowId: string, nodeId: string, newPosition: { x: number; y: number }): Promise<Node> {
    try {
      console.log('🔧 FlowService.moveNode called with:', { flowId, nodeId, newPosition });
      return await this.updateNode(flowId, nodeId, { position: newPosition });
    } catch (error) {
      console.error('❌ Error in moveNode:', error);
      throw error;
    }
  }

  // Connection operations
  async addConnection(flowId: string, connectionData: Omit<ConnectionProps, 'id'>): Promise<Connection> {
    try {
      console.log('🔧 FlowService.addConnection called with:', { flowId, connectionData });
      
      // Obtener el flow
      const flow = await this.flowRepository.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow with id ${flowId} not found`);
      }
      
      // Verificar que existan los nodos
      const sourceNode = flow.nodes.find(n => n.id === connectionData.sourceNodeId);
      const targetNode = flow.nodes.find(n => n.id === connectionData.targetNodeId);
      
      if (!sourceNode) {
        throw new Error(`Source node with id ${connectionData.sourceNodeId} not found`);
      }
      
      if (!targetNode) {
        throw new Error(`Target node with id ${connectionData.targetNodeId} not found`);
      }
      
      console.log('✅ Source and target nodes found');
      
      // Verificar si ya existe una conexión similar
      const existingConnection = flow.connections.find(
        conn => conn.sourceNodeId === connectionData.sourceNodeId &&
               conn.targetNodeId === connectionData.targetNodeId
      );
      
      if (existingConnection) {
        console.log('⚠️ Similar connection already exists, returning it');
        return existingConnection;
      }
      
      // Crear conexión con todos los parámetros
      const connection = new Connection({
        id: uuidv4(), // Asegurar un ID único
        sourceNodeId: connectionData.sourceNodeId,
        targetNodeId: connectionData.targetNodeId,
        sourceHandle: connectionData.sourceHandle || undefined,
        targetHandle: connectionData.targetHandle || undefined,
        style: {
          stroke: '#94a3b8',
          strokeWidth: 2
        }
      });
      console.log('✅ Connection created:', connection);
      
      // Agregar conexión al flow
      flow.addConnection(connection);
      console.log('✅ Connection added to flow');
      
      // Guardar flow actualizado
      await this.flowRepository.saveFlow(flow);
      console.log('✅ Flow saved with new connection');
      
      return connection;
    } catch (error) {
      console.error('❌ Error in addConnection:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        flowId,
        connectionData
      });
      throw error;
    }
  }

  async removeConnection(flowId: string, connectionId: string): Promise<Flow> {
    try {
      console.log('🔧 FlowService.removeConnection called with:', { flowId, connectionId });
      
      // Obtener el flow
      const flow = await this.flowRepository.getFlowById(flowId);
      if (!flow) {
        throw new Error(`Flow with id ${flowId} not found`);
      }
      
      // Eliminar conexión
      flow.removeConnection(connectionId);
      
      // Guardar flow actualizado
      await this.flowRepository.saveFlow(flow);
      
      return flow;
    } catch (error) {
      console.error('❌ Error in removeConnection:', error);
      throw error;
    }
  }

  async saveFlow(flow: Flow): Promise<Flow> {
    try {
      console.log('🔧 FlowService.saveFlow called with flow ID:', flow.id);
      return await this.flowRepository.saveFlow(flow);
    } catch (error) {
      console.error('❌ Error in saveFlow:', error);
      throw error;
    }
  }

  // Helpers
  async getSelectedNodes(flowId: string): Promise<Node[]> {
    try {
      const flow = await this.flowRepository.getFlowById(flowId);
      return flow ? flow.nodes.filter(node => node.selected) : [];
    } catch (error) {
      console.error('❌ Error in getSelectedNodes:', error);
      throw error;
    }
  }
}
