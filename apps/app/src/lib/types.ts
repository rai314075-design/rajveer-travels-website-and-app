export type { Booking, CreateBookingResponse, Language, User } from '@rajveer/shared';


export interface TripSummary {
  id: string;
  departureTime: string;
  arrivalTime: string;
  travelDate: string;
  fare: number;
  bus: {
    operator: string;
    busNumber: string;
    type: string;
    description: string | null;
    upiId: string | null;
    paymentQrUrl: string | null;
  };
  route: {
    source: string;
    destination: string;
    pickupPoint: string | null;
    dropPoint: string | null;
  };
}

// GET /api/trips/[id]
export interface TripDetail {
  id: string;
  departureTime: string;
  arrivalTime: string;
  travelDate: string;
  fare: string | number;
  bus: {
    operator: string;
    busNumber: string;
    description: string | null;
    ownerPhone: string | null;
    upiId: string | null;
    amenities?: string[];
  };
  route: { source: string; destination: string; pickupPoint?: string | null; dropPoint?: string | null };
}

export type Deck = 'LOWER' | 'UPPER';
export type SeatType = 'SEAT' | 'SLEEPER';
export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'BOOKED';

// GET /api/seats/status
export interface SeatState {
  seatTemplateId: string;
  seatNumber: string;
  type: SeatType;
  deck: Deck;
  status: SeatStatus;
  lockedUntil: string | null;
  rowSpan: number;
  colSpan: number;
  xPosition: number;
  yPosition: number;
}

// GET /api/bookings
export interface Notice {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}



