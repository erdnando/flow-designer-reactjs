import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import { Node } from '../../domain/entities/Node';
import type { NodeProps } from '../../shared/types';
import { logger } from '../../shared/utils';

export class AddNodeToFlowUseCase {
  constructor(private flowRepository: FlowRepository) {}

  async execute(flowId: string, nodeData: Omit<NodeProps, 'id'>): Promise<Node> {
    logger.debug('AddNodeToFlowUseCase.execute called with:', { flowId, nodeData });
    
    const node = new Node(nodeData);
    logger.debug('Created new node:', node);
    
    const updatedFlow = await this.flowRepository.addNodeToFlow(flowId, node);
    logger.debug('Flow updated by repository, total nodes:', updatedFlow.nodes.length);
    
    // Retornar el nodo agregado
    const addedNode = updatedFlow.nodes.find(n => n.id === node.id);
    if (!addedNode) {
      logger.error('Failed to find added node in flow');
      throw new Error('Failed to add node to flow');
    }
    
    logger.success('AddNodeToFlowUseCase returning node:', addedNode);
    return addedNode;
  }
}
