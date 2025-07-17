import { v4 as uuidv4 } from 'uuid';
import type { ConnectionStyle, ConnectionProps } from '../../shared/types';

export class Connection {
  public readonly id: string;
  public sourceNodeId: string;
  public targetNodeId: string;
  public sourceHandle: string;
  public targetHandle: string;
  public selected: boolean;
  public style: ConnectionStyle;
  public readonly createdAt: Date;

  // Propiedades adicionales para el sistema de propiedades
  public name: string;
  public mapping: {
    sourceOutput: string;
    targetInput: string;
    transformations?: any[];
  };

  constructor({
    id = uuidv4(),
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    selected = false,
    style = {}
  }: ConnectionProps) {
    this.id = id;
    this.sourceNodeId = sourceNodeId;
    this.targetNodeId = targetNodeId;
    this.sourceHandle = sourceHandle || '';
    this.targetHandle = targetHandle || '';
    this.selected = selected;
    this.style = style;
    this.createdAt = new Date();
    
    // Propiedades adicionales
    this.name = `${sourceNodeId}-${targetNodeId}`;
    this.mapping = {
      sourceOutput: sourceHandle || '',
      targetInput: targetHandle || '',
      transformations: []
    };
    
    console.log('🔧 Connection constructor, handles:', { 
      sourceHandle: this.sourceHandle, 
      targetHandle: this.targetHandle 
    });
  }

  select(): Connection {
    this.selected = true;
    return this;
  }

  deselect(): Connection {
    this.selected = false;
    return this;
  }

  updateStyle(newStyle: Partial<ConnectionStyle>): Connection {
    this.style = { ...this.style, ...newStyle };
    return this;
  }

  /**
   * Actualiza las propiedades de la conexión
   */
  updateProperties(updates: Partial<{
    name: string;
    mapping: {
      sourceOutput: string;
      targetInput: string;
      transformations?: any[];
    };
  }>): Connection {
    Object.assign(this, updates);
    return this;
  }

  toJSON(): ConnectionProps & { createdAt: Date } {
    return {
      id: this.id,
      sourceNodeId: this.sourceNodeId,
      targetNodeId: this.targetNodeId,
      sourceHandle: this.sourceHandle,
      targetHandle: this.targetHandle,
      selected: this.selected,
      style: this.style,
      createdAt: this.createdAt
    };
  }

  static fromJSON(json: ConnectionProps & { createdAt?: string }): Connection {
    const connection = new Connection(json);
    if (json.createdAt) {
      (connection as any).createdAt = new Date(json.createdAt);
    }
    return connection;
  }
}
