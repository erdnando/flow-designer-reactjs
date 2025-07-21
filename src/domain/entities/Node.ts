import { v4 as uuidv4 } from 'uuid';
import { immerable } from 'immer';
import type { Position, NodeData, NodeType, NodeProps } from '../../shared/types';

export class Node {
  [immerable] = true; // Marca para Immer compatibility
  
  public readonly id: string;
  public type: NodeType;
  public position: Position;
  public data: NodeData;
  public selected: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  // Propiedades adicionales para el sistema de propiedades
  public get name(): string {
    return this.data.label || '';
  }

  public set name(value: string) {
    this.data.label = value;
    this.updatedAt = new Date();
  }

  public get description(): string {
    return this.data.description || '';
  }

  public set description(value: string) {
    this.data.description = value;
    this.updatedAt = new Date();
  }

  public get status(): string {
    return this.data.status || 'idle';
  }

  public set status(value: string) {
    this.data.status = value as any;
    this.updatedAt = new Date();
  }

  constructor({
    id = uuidv4(),
    type,
    position = { x: 0, y: 0 },
    data = {},
    selected = false
  }: NodeProps) {
    this.id = id;
    this.type = type;
    this.position = position;
    this.data = data;
    this.selected = selected;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updatePosition(newPosition: Position): Node {
    if (!newPosition) {
      console.error('❌ Invalid position provided to updatePosition');
      return this;
    }

    // Ensure we have both x and y values
    const currentPosition = this.position || { x: 0, y: 0 };

    // Update position with provided values, keeping existing values if not provided
    this.position = {
      x: newPosition.x !== undefined ? Math.round(newPosition.x) : currentPosition.x,
      y: newPosition.y !== undefined ? Math.round(newPosition.y) : currentPosition.y
    };

    this.updatedAt = new Date();
    return this;
  }

  updateData(newData: Partial<NodeData>): Node {
    this.data = { ...this.data, ...newData };
    this.updatedAt = new Date();
    return this;
  }

  select(): Node {
    this.selected = true;
    return this;
  }

  deselect(): Node {
    this.selected = false;
    return this;
  }

  clone(): Node {
    return new Node({
      id: uuidv4(),
      type: this.type,
      position: { ...this.position },
      data: { ...this.data },
      selected: false
    });
  }

  /**
   * Actualiza las propiedades del nodo
   */
  updateProperties(updates: Partial<NodeProps>): Node {
    Object.assign(this, updates);
    this.updatedAt = new Date();
    return this;
  }

  toJSON(): NodeProps & { createdAt: Date; updatedAt: Date } {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      data: this.data,
      selected: this.selected,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json: NodeProps & { createdAt?: string; updatedAt?: string }): Node {
    const node = new Node(json);
    if (json.createdAt) {
      (node as any).createdAt = new Date(json.createdAt);
    }
    if (json.updatedAt) {
      node.updatedAt = new Date(json.updatedAt);
    }
    return node;
  }
}
