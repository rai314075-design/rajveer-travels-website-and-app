// Seat-related TypeScript interfaces shared across the booking system.

export type Deck = "LOWER" | "UPPER";
export type SeatType = "SEAT" | "SLEEPER";
export type ReservationStatus = "AVAILABLE" | "LOCKED" | "BOOKED";

/**
 * A seat template defines the static layout of a seat on a vehicle.
 * It is the source of truth for what seats exist, where they sit, and
 * what kind of seat they are (seat vs sleeper, lower vs upper deck).
 */
export interface SeatTemplate {
  id: string;
  vehicleId: string;
  seatNumber: string;
  deck: Deck;
  type: SeatType;
  rowSpan: number;
  colSpan: number;
  xPosition: number;
  yPosition: number;
}

/**
 * The runtime state of a seat for a specific trip/schedule.
 * This is what the user sees when selecting seats.
 */
export interface SeatState {
  seatTemplateId: string;
  seatNumber: string;
  type: SeatType;
  deck: Deck;
  status: ReservationStatus;
  lockedBy?: string | null;
  lockedUntil?: string | null;
  rowSpan: number;
  colSpan: number;
  xPosition: number;
  yPosition: number;
}

/**
 * Request body for the lock endpoint.
 */
export interface LockSeatsRequest {
  tripId: string;
  seatTemplateIds: string[];
}

/**
 * Response from the lock endpoint.
 */
export interface LockSeatsResponse {
  success: boolean;
  reservations: SeatState[];
  lockedUntil: string;
}

/**
 * Request body for the unlock endpoint.
 */
export interface UnlockSeatsRequest {
  tripId: string;
  seatTemplateIds: string[];
}

/**
 * Response from the status endpoint.
 */
export interface SeatStatusResponse {
  seats: SeatState[];
}

/**
 * A preset layout definition used by the admin layout builder.
 */
export interface PresetLayout {
  id: string;
  name: string;
  description: string;
  totalDecks: number;
  seats: Omit<SeatTemplate, "id" | "vehicleId">[];
}