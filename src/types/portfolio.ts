// Portfolio and filtering types

export interface PortfolioPosition {
  readonly ticker: string;
  readonly amount: number;
  readonly avgPrice?: number;
}

export interface FilterCsv {
  readonly ticker: string[];
  readonly amount: number[];
}

export interface PortfolioData {
  readonly positions: PortfolioPosition[];
  readonly totalValue: number;
  readonly currency: string;
}

export interface PortfolioAnalysis {
  readonly portfolio: PortfolioData;
  readonly performance: {
    readonly totalGainLoss: number;
    readonly totalGainLossPct: number;
    readonly topPerformers: PortfolioPosition[];
    readonly worstPerformers: PortfolioPosition[];
  };
}
