export interface OrganizerEvent {
  id: string;
  name: string;
  status: string;
  sold: number;
  capacity: number;
  price: number;
}

export interface OrganizerStats {
  totalSales: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
}
