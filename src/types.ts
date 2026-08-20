export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  checked?: boolean;
}

export interface ShoppingListModel {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  tags?: string[];
  paidBy?: string;
  jointPayment?: boolean;
  totalAmount?: number;
  installmentIndex?: number;
  installmentsCount?: number;
}

export interface HouseholdUser {
  id: string;
  name: string;
  income: number;
}

export interface MonthlyExpenseModel {
  id: string;
  monthYear: string; // e.g. "2023-10"
  expenses: ExpenseItem[];
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
