export interface Reservation {
  id: number;
  email: string;
  tableNo: string;
  reservationDate: string; // "2025-05-20"
  reservationTime: string; // "12:00"
  partySize: number;
  customerName: string;
  customerPhone: string;
  note?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  reservationCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface CreateReservationRequest {
  tableNo: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  note?: string;
}