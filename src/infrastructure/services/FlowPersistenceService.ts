import { Flow } from '../../domain/entities/Flow';
import { Node } from '../../domain/entities/Node';
import { Connection } from '../../domain/entities/Connection';
import { logger } from '../../shared/utils/logger';

/**
 * Servicio para persistencia completa de flujos en localStorage
 * Guarda/carga flujos completos con nodos, conexiones y propiedades
 */
export class FlowPersistenceService {
  private readonly STORAGE_KEY_PREFIX = 'flow_designer_flow_';
  
  /**
   * Guarda un flujo completo en localStorage
   */
  saveFlow(flow: Flow): void {
    try {
      if (!flow || !flow.id) {
        logger.warn('Intentando guardar un flujo inválido');
        return;
      }
      
      const key = this.STORAGE_KEY_PREFIX + flow.id;
      
      // Convertir el flujo a un objeto plano para serialización
      const flowData = {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        status: flow.status || 'draft',
        owner: flow.owner || '',
        creator: flow.creator || flow.owner || '',
        nodes: flow.nodes.map(node => ({
          id: node.id,
          type: node.type, // NodeType es un tipo string, no un objeto con propiedad value
          name: node.data?.label || '', // Usar data.label como nombre
          description: node.data?.description || '',
          position: node.position ? {
            x: node.position.x,
            y: node.position.y
          } : null,
          data: node.data || {}
        })),
        connections: flow.connections.map(conn => ({
          id: conn.id,
          sourceNodeId: conn.sourceNodeId,
          targetNodeId: conn.targetNodeId,
          sourceHandle: conn.sourceHandle || '',
          targetHandle: conn.targetHandle || '',
          style: conn.style || {}
        }))
      };
      
      const serialized = JSON.stringify(flowData);
      localStorage.setItem(key, serialized);
      logger.success(`Flujo completo guardado: ${flow.id} (${flow.nodes.length} nodos, ${flow.connections.length} conexiones)`);
    } catch (error) {
      logger.error('Error al guardar flujo en localStorage:', error);
    }
  }
  
  /**
   * Carga un flujo desde localStorage por su ID
   * Reconstruye el flujo con sus entidades completas
   */
  loadFlow(flowId: string): Flow | null {
    try {
      const key = this.STORAGE_KEY_PREFIX + flowId;
      const serialized = localStorage.getItem(key);
      
      if (!serialized) {
        logger.debug(`No se encontró flujo guardado para ID: ${flowId}`);
        return null;
      }
      
      const flowData = JSON.parse(serialized);
      
      // Recrear nodos
      const nodes = flowData.nodes.map((nodeData: any) => {
        // Asegurarse de que data contenga label (nombre) y description
        const nodeDataWithLabels = {
          ...nodeData.data || {},
          label: nodeData.name || nodeData.data?.label || '',
          description: nodeData.description || nodeData.data?.description || ''
        };
        
        const node = new Node({
          id: nodeData.id,
          type: nodeData.type,
          data: nodeDataWithLabels,
          position: nodeData.position || { x: 0, y: 0 }
        });
        
        return node;
      });
      
      // Recrear conexiones
      const connections = flowData.connections.map((connData: any) => {
        return new Connection({
          id: connData.id,
          sourceNodeId: connData.sourceNodeId,
          targetNodeId: connData.targetNodeId,
          sourceHandle: connData.sourceHandle || '',
          targetHandle: connData.targetHandle || '',
          style: connData.style || {}
        });
      });
      
      // Recrear entidades del dominio con todos los datos
      const flow = new Flow({
        id: flowData.id,
        name: flowData.name,
        description: flowData.description,
        nodes: nodes,
        connections: connections,
        status: flowData.status || 'draft',
        owner: flowData.owner || '',
        creator: flowData.creator || flowData.owner || ''
      });
      
      logger.success(`Flujo cargado desde localStorage: ${flowId} (${flow.nodes.length} nodos, ${flow.connections.length} conexiones)`);
      return flow;
    } catch (error) {
      logger.error('Error al cargar flujo desde localStorage:', error);
      return null;
    }
  }
  
  /**
   * Elimina un flujo de localStorage
   */
  deleteFlow(flowId: string): void {
    try {
      const key = this.STORAGE_KEY_PREFIX + flowId;
      localStorage.removeItem(key);
      logger.success(`Flujo eliminado de localStorage: ${flowId}`);
    } catch (error) {
      logger.error('Error al eliminar flujo de localStorage:', error);
    }
  }
  
  /**
   * Lista todos los IDs de flujos guardados
   */
  listSavedFlowIds(): string[] {
    const ids: string[] = [];
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          const id = key.substring(this.STORAGE_KEY_PREFIX.length);
          ids.push(id);
        }
      }
      
      logger.debug(`Flujos guardados encontrados: ${ids.length}`);
    } catch (error) {
      logger.error('Error al listar flujos guardados:', error);
    }
    
    return ids;
  }

  /**
   * Verifica y consolida las posiciones de los nodos
   * Asegura consistencia entre flujos y su información de posición
   */
  verifyNodePositions(flow: Flow): void {
    try {
      if (!flow || !flow.id) {
        logger.warn('Flujo inválido para verificar posiciones');
        return;
      }

      // Importar dinámicamente el servicio de posiciones
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PositionPersistenceService = require('./PositionPersistenceService').PositionPersistenceService;
      const positionService = new PositionPersistenceService();
      
      // Cargar posiciones guardadas
      const savedPositions = positionService.loadFlowPositions(flow.id);
      logger.debug(`Verificando posiciones: Flujo ${flow.id}, Nodos: ${flow.nodes.length}, Posiciones: ${savedPositions.size}`);
      
      // Asegurar que cada nodo tenga posición
      flow.nodes.forEach(node => {
        if (!node.position) {
          logger.warn(`Nodo ${node.id} sin posición en el flujo`);
          return;
        }
        
        if (!savedPositions.has(node.id)) {
          logger.warn(`Nodo ${node.id} sin posición persistida, guardando...`);
          positionService.updateNodePosition(flow.id, node.id, node.position);
        }
      });
      
      // Eliminar posiciones de nodos que ya no existen
      const nodeIds = new Set(flow.nodes.map(node => node.id));
      savedPositions.forEach((_: any, nodeId: string) => {
        if (!nodeIds.has(nodeId)) {
          logger.warn(`Posición huérfana para nodo ${nodeId}, eliminando...`);
          positionService.removeNodePosition(flow.id, nodeId);
        }
      });
      
      logger.success(`Verificación de posiciones completada para flujo ${flow.id}`);
    } catch (error) {
      logger.error('Error al verificar posiciones de nodos:', error);
    }
  }
}
