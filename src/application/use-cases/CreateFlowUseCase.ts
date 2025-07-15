import type { FlowRepository } from '../../domain/repositories/FlowRepository';
import { Flow } from '../../domain/entities/Flow';
import type { FlowProps } from '../../shared/types';
import { logger } from '../../shared/utils';

export class CreateFlowUseCase {
  constructor(private flowRepository: FlowRepository) {}

  async execute(flowData: Omit<FlowProps, 'id'>): Promise<Flow> {
    logger.debug('CreateFlowUseCase.execute called with:', flowData);
    
    try {
      // Crear una nueva instancia de Flow
      const { id, ...rest } = flowData as any;
      const flow = new Flow({
        ...rest
      });
      
      logger.debug('Created new flow:', flow);
      const savedFlow = await this.flowRepository.saveFlow(flow);
      logger.success('Flow saved by repository:', savedFlow);
      return savedFlow;
    } catch (error) {
      console.error('❌ CreateFlowUseCase error:', error);
      throw error;
    }
  }
}
