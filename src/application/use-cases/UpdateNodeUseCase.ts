import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import type { Node } from '../../domain/entities/Node';
import type { Position } from '../../shared/types';

export interface UpdateNodeData {
  position?: Position;
  data?: Record<string, any>;
  selected?: boolean;
}

export class UpdateNodeUseCase {
  constructor(private flowRepository: FlowRepository) {}

  async execute(flowId: string, nodeId: string, updates: UpdateNodeData): Promise<Node> {
    const updatedFlow = await this.flowRepository.updateNode(flowId, nodeId, updates);
    
    const updatedNode = updatedFlow.nodes.find(n => n.id === nodeId);
    if (!updatedNode) {
      throw new Error(`Node with id ${nodeId} not found`);
    }
    
    return updatedNode;
  }
}
