// CEDOI Contracts: Shared Enums, DTOs, and Interfaces

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SCANNER = 'SCANNER',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum TicketTypeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SOLD_OUT = 'SOLD_OUT',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  EXPIRED = 'EXPIRED',
  CANCELLATION_PENDING = 'CANCELLATION_PENDING',
  CANCELLED = 'CANCELLED',
  PAYMENT_EXCEPTION = 'PAYMENT_EXCEPTION',
}

export enum ReservationStatus {
  HELD = 'HELD',
  CONSUMED = 'CONSUMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentAttemptStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
}

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum CheckInResult {
  SUCCESS = 'SUCCESS',
  ALREADY_USED = 'ALREADY_USED',
  INVALID = 'INVALID',
  CANCELLED = 'CANCELLED',
  WRONG_EVENT = 'WRONG_EVENT',
  OUTSIDE_WINDOW = 'OUTSIDE_WINDOW',
}

export enum PdfArtifactStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum OutboxJobType {
  PDF_GENERATION = 'PDF_GENERATION',
  RESERVATION_EXPIRY = 'RESERVATION_EXPIRY',
  PAYMENT_RECONCILIATION = 'PAYMENT_RECONCILIATION',
  REPORT_GENERATION = 'REPORT_GENERATION',
}

export enum OutboxJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Standard API Response Envelope
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Public Event DTOs
export interface PublicTicketTypeDto {
  id: string;
  name: string;
  description: string | null;
  unitPricePaise: number;
  capacity: number;
  remainingCapacity: number;
  maxPerBooking: number;
  status: TicketTypeStatus;
}

export interface PublicEventDto {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: EventStatus;
  bannerUrl?: string | null;
  ticketTypes: PublicTicketTypeDto[];
}

// Reservation & Booking DTOs
export type MemberType = 'MEMBER' | 'NON_MEMBER';
export type FoodPreference = 'VEG' | 'NON_VEG';

export interface ReservationItemSelection {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateReservationDto {
  eventId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  businessName?: string;
  location?: string;
  age?: number;
  agreedToTerms?: boolean;
  memberType?: MemberType;
  foodPreference?: FoodPreference;
  items: ReservationItemSelection[];
  idempotencyKey?: string;
}

export interface ReservationResponseDto {
  bookingId: string;
  bookingNumber: string;
  reservationId: string;
  expiresAt: string;
  totalPaise: number;
  currency: string;
  recoveryCode: string; // ONLY returned once upon initial creation
  items: {
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
}

export interface BookingDetailDto {
  id: string;
  bookingNumber: string;
  eventId: string;
  eventName: string;
  eventVenue: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventTimezone: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  businessName?: string | null;
  location?: string | null;
  age?: number | null;
  memberType?: MemberType;
  foodPreference?: FoodPreference;
  currency: string;
  subtotalPaise: number;
  totalPaise: number;
  status: BookingStatus;
  reservationExpiresAt?: string | null;
  createdAt: string;
  items: {
    id: string;
    ticketTypeId: string;
    ticketTypeName: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
  paymentAttempt?: {
    id: string;
    razorpayOrderId?: string | null;
    status: PaymentAttemptStatus;
    amountPaise: number;
  } | null;
  tickets?: {
    id: string;
    ticketNumber: string;
    ticketTypeName: string;
    admissionIndex: number;
    status: TicketStatus;
    attendeeName?: string | null;
    businessName?: string | null;
    location?: string | null;
    memberType?: MemberType;
    foodPreference?: FoodPreference;
    qrData?: string; // QR token or payload for rendering
  }[];
  pdfArtifact?: {
    status: PdfArtifactStatus;
    downloadUrl?: string | null;
  } | null;
}

// Payment DTOs
export interface CreatePaymentOrderDto {
  bookingNumber: string;
}

export interface CashfreeOrderResponseDto {
  orderId: string;
  paymentSessionId: string;
  cfOrderId?: string;
  amountPaise: number;
  amountRupees: number;
  currency: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
}

// Backward-compatible alias
export type PaymentOrderResponseDto = CashfreeOrderResponseDto;
export type RazorpayOrderResponseDto = CashfreeOrderResponseDto & { keyId?: string };

export interface VerifyPaymentDto {
  bookingNumber: string;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  cfOrderId?: string;
  cfPaymentId?: string;
  // Legacy Razorpay compatibility fields
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface PaymentVerificationResultDto {
  bookingNumber: string;
  status: BookingStatus;
  ticketsIssued: number;
  pdfStatus: PdfArtifactStatus;
}

// Scanner Check-In DTOs
export interface CheckInRequestDto {
  eventId: string;
  gateId?: string;
  qrCredential?: string;
  ticketNumber?: string;
  requestId: string; // client UUID for idempotency
}

export interface CheckInResponseDto {
  result: CheckInResult;
  message: string;
  isDuplicateRequest: boolean;
  ticket?: {
    ticketNumber: string;
    ticketTypeName: string;
    customerName: string; // labeled as buyer
    attendeeName?: string | null;
    businessName?: string | null;
    location?: string | null;
    memberType?: MemberType;
    foodPreference?: FoodPreference;
    status: TicketStatus;
    admissionIndex: number;
  };
  admittedAt?: string;
  admittedGate?: string;
  firstAdmittedAt?: string;
  firstAdmittedGate?: string;
}

// Staff & Auth DTOs
export interface StaffLoginDto {
  email: string;
  password: string;
}

export interface StaffProfileDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedEventIds: string[];
}

// Admin Metrics DTOs
export interface AdminDashboardMetricsDto {
  event: {
    id: string;
    name: string;
    status: EventStatus;
    totalCapacity?: number | null;
  };
  tickets: {
    totalCapacity: number;
    totalSold: number;
    totalReserved: number;
    totalAvailable: number;
    totalCheckedIn: number;
    totalCancelled: number;
  };
  catering: {
    totalVeg: number;
    totalNonVeg: number;
  };
  membership: {
    totalMembers: number;
    totalNonMembers: number;
  };
  financials: {
    grossCollectionsPaise: number;
    refundsPaise: number;
    netCollectionsPaise: number;
    currency: string;
  };
  categoryBreakdown: {
    ticketTypeId: string;
    name: string;
    unitPricePaise: number;
    capacity: number;
    sold: number;
    reserved: number;
    available: number;
    checkedIn: number;
  }[];
}
