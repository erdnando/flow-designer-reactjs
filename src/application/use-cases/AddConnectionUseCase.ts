import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import { Connection } from '../../domain/entities/Connection';
import type { ConnectionProps } from '../../shared/types';

export class AddConnectionUseCase {
  constructor(private flowRepository: FlowRepository) {}

  async execute(flowId: string, connectionData: Omit<ConnectionProps, 'id'>): Promise<Connection> {
    // Validar que los nodos existen
    const flow = await this.flowRepository.getFlowById(flowId);
    if (!flow) {
      throw new Error(`Flow with id ${flowId} not found`);
    }

    const sourceNode = flow.nodes.find(n => n.id === connectionData.sourceNodeId);
    const targetNode = flow.nodes.find(n => n.id === connectionData.targetNodeId);

    if (!sourceNode) {
      throw new Error(`Source node ${connectionData.sourceNodeId} not found`);
    }
    if (!targetNode) {
      throw new Error(`Target node ${connectionData.targetNodeId} not found`);
    }

    // Validar que no se esté creando una conexión circular
    if (connectionData.sourceNodeId === connectionData.targetNodeId) {
      throw new Error('Cannot create connection to the same node');
    }

    const connection = new Connection(connectionData);
    const updatedFlow = await this.flowRepository.addConnectionToFlow(flowId, connection);
    
    // Retornar la conexión agregada
    const addedConnection = updatedFlow.connections.find(c => c.id === connection.id);
    if (!addedConnection) {
      throw new Error('Failed to add connection to flow');
    }
    
    return addedConnection;
  }
}
