import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import { Node } from '../../domain/entities/Node';
import type { NodeProps } from '../../shared/types';

export class AddNodeToFlowUseCase {
  constructor(private flowRepository: FlowRepository) {}

  async execute(flowId: string, nodeData: Omit<NodeProps, 'id'>): Promise<Node> {
    console.log('🔧 AddNodeToFlowUseCase.execute called with:', { flowId, nodeData });
    
    const node = new Node(nodeData);
    console.log('🔧 Created new node:', node);
    
    const updatedFlow = await this.flowRepository.addNodeToFlow(flowId, node);
    console.log('🔧 Flow updated by repository, total nodes:', updatedFlow.nodes.length);
    
    // Retornar el nodo agregado
    const addedNode = updatedFlow.nodes.find(n => n.id === node.id);
    if (!addedNode) {
      console.error('❌ Failed to find added node in flow');
      throw new Error('Failed to add node to flow');
    }
    
    console.log('✅ AddNodeToFlowUseCase returning node:', addedNode);
    return addedNode;
  }
}
