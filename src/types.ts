export interface PhysicsNode {
  id: string;
  title: string;
  explanation: string;
  formulas: string[];
  quantities: PhysicalQuantity[];
  facts: string[];
  relatedTopics?: RelatedTopic[];
}

export interface RelatedTopic {
  label: string;
  query: string;
}

export interface PhysicalQuantity {
  symbol: string;
  symbolName: string;
  name: string;
  unit: string;
  description: string;
}

export interface NavigationState {
  history: PhysicsNode[];
  current: PhysicsNode | null;
}
