export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Position coordinates must be finite numbers');
    }
  }

  add(other: Position): Position {
    return new Position(this.x + other.x, this.y + other.y);
  }

  subtract(other: Position): Position {
    return new Position(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Position {
    return new Position(this.x * scalar, this.y * scalar);
  }

  distance(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toJSON(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  static fromJSON(json: { x: number; y: number }): Position {
    return new Position(json.x, json.y);
  }

  static zero(): Position {
    return new Position(0, 0);
  }
}
