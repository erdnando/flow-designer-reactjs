export interface SelectionState {
  type: 'flow' | 'node' | 'connection' | null;
  elementId: string | null;
}

export interface SelectionContextType {
  selection: SelectionState;
  selectFlow: () => void;
  selectNode: (nodeId: string) => void;
  selectConnection: (connectionId: string) => void;
  clearSelection: () => void;
}
