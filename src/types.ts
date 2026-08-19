export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
}

export interface ShoppingListModel {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
}

export interface AIAnalysisResult {
  suggestedStore: string;
  reasoning: string;
  totalEstimatedPrice: number;
  itemEstimates: {
    name: string;
    estimatedPrice: number;
    estimatedTotal: number;
  }[];
}
