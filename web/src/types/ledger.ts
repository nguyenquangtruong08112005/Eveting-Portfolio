export interface LedgerEntry {
  id: string;
  orderId: string;
  eventName: string;
  gross: number;
  fee: number;
  net: number;
  date: number;
}
