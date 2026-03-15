export interface PhysicsNode {
  id: string;
  title: string;
  explanation: string;
  formulas: string[];
  quantities: PhysicalQuantity[];
}

export interface PhysicalQuantity {
  symbol: string;
  name: string;
  unit: string;
  description: string;
}

export interface NavigationState {
  history: PhysicsNode[];
  current: PhysicsNode | null;
}
