import type { NodeType } from '../../shared/types';

export class NodeTypeVO {
  private static readonly VALID_TYPES: NodeType[] = ['start', 'end', 'if', 'step'];

  constructor(public readonly value: NodeType) {
    if (!NodeTypeVO.VALID_TYPES.includes(value)) {
      throw new Error(`Invalid node type: ${value}. Valid types are: ${NodeTypeVO.VALID_TYPES.join(', ')}`);
    }
  }

  static start(): NodeTypeVO {
    return new NodeTypeVO('start');
  }

  static end(): NodeTypeVO {
    return new NodeTypeVO('end');
  }

  static if(): NodeTypeVO {
    return new NodeTypeVO('if');
  }

  static step(): NodeTypeVO {
    return new NodeTypeVO('step');
  }

  isStart(): boolean {
    return this.value === 'start';
  }

  isEnd(): boolean {
    return this.value === 'end';
  }

  isIf(): boolean {
    return this.value === 'if';
  }

  isStep(): boolean {
    return this.value === 'step';
  }

  canHaveMultipleOutputs(): boolean {
    return this.value === 'if';
  }

  canHaveInputs(): boolean {
    return this.value !== 'start';
  }

  canHaveOutputs(): boolean {
    return this.value !== 'end';
  }

  equals(other: NodeTypeVO): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): NodeType {
    return this.value;
  }

  static fromJSON(json: NodeType): NodeTypeVO {
    return new NodeTypeVO(json);
  }

  static getAllTypes(): NodeType[] {
    return [...NodeTypeVO.VALID_TYPES];
  }
}
