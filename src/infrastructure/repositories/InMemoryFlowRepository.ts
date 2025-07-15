import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import type { FlowProps } from '../../shared/types';
import { logger } from '../../shared/utils';

export class InMemoryFlowRepository implements FlowRepository {
  private flows: Map<string, Flow> = new Map();

  async saveFlow(flow: Flow): Promise<Flow> {
    try {
      logger.debug('InMemoryFlowRepository.saveFlow called with flow:', flow);
      logger.debug('Flow ID:', flow.id);
      
      if (!flow.id) {
        logger.error('Flow ID is missing!');
        throw new Error('Cannot save flow: ID is required');
      }
      
      this.flows.set(flow.id, flow);
      logger.success('Flow saved in repository. Current flows:', this.flows.size);
      return flow;
    } catch (error) {
      logger.error('Error in saveFlow:', error);
      throw error;
    }
  }

  async getFlowById(id: string): Promise<Flow | null> {
    try {
      logger.debug('InMemoryFlowRepository.getFlowById called with id:', id);
      const flow = this.flows.get(id) || null;
      logger.debug('Flow found:', !!flow);
      return flow;
    } catch (error) {
      logger.error('Error in getFlowById:', error);
      throw error;
    }
  }

  async getAllFlows(): Promise<Flow[]> {
    return Array.from(this.flows.values());
  }

  async deleteFlow(id: string): Promise<boolean> {
    return this.flows.delete(id);
  }

  async addNodeToFlow(flowId: string, node: Node): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.addNode(node);
    this.flows.set(flowId, flow);
    return flow;
  }

  async updateNode(flowId: string, nodeId: string, updates: Partial<Node>): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.updateNode(nodeId, updates);
    this.flows.set(flowId, flow);
    return flow;
  }

  async removeNodeFromFlow(flowId: string, nodeId: string): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.removeNode(nodeId);
    this.flows.set(flowId, flow);
    return flow;
  }

  async addConnectionToFlow(flowId: string, connection: Connection): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.addConnection(connection);
    this.flows.set(flowId, flow);
    return flow;
  }

  async removeConnectionFromFlow(flowId: string, connectionId: string): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.removeConnection(connectionId);
    this.flows.set(flowId, flow);
    return flow;
  }

  async selectNode(flowId: string, nodeId: string): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.selectNode(nodeId);
    this.flows.set(flowId, flow);
    return flow;
  }

  async clearSelection(flowId: string): Promise<Flow> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }
    
    flow.clearSelection();
    this.flows.set(flowId, flow);
    return flow;
  }

  async createFlow(flowData: Omit<FlowProps, 'id'>): Promise<Flow> {
    try {
      logger.debug('InMemoryFlowRepository.createFlow called with:', flowData);
      // Crear un flujo con un ID generado
      const flow = new Flow({
        ...flowData
      });
      logger.success('Flow created in repository:', flow);
      
      // Guardar en memoria
      return await this.saveFlow(flow);
    } catch (error) {
      logger.error('Error in InMemoryFlowRepository.createFlow:', error);
      throw error;
    }
  }
}
