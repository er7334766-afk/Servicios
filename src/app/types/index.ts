export type Role = 'client' | 'worker';

export type ServiceCategory =
  | 'plomeria'
  | 'electricidad'
  | 'limpieza'
  | 'construccion'
  | 'pintura'
  | 'carpinteria'
  | 'jardineria'
  | 'electrodomesticos';

export type BookingStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: Role;
  location: string;
  joinedDate: string;

  // Agregado
  titulo?: string;
  dni?: string;
  antecedente?: string;
  direccion?: string;
  categoria?: string;
  estado?: string;
  numeroTrabajos?: number;
  fechaCreacion?: string;
}

export interface Worker extends User {
  role: 'worker';
  categories: ServiceCategory[];
  rating: number;
  reviewCount: number;
  jobCount: number;
  bio: string;
  distanceKm: number;
  pricePerHour: number;
  isAvailable: boolean;
  galleryUrls: string[];
  services: string[];
}

export interface Client extends User {
  role: 'client';
}

export interface Booking {
  id: string;
  workerId: string;
  workerName: string;
  workerAvatar: string;
  clientId: string;
  clientName: string;
  category: ServiceCategory;
  description: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  price: number;
  address: string;
}

export interface JobPost {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  category: ServiceCategory;
  title: string;
  description: string;
  budget: number;
  date: string;
  location: string;
  postedAt: string;
  applicantCount: number;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl: string;
  targetId: string;
  rating: number;
  punctualityRating: number;
  qualityRating: number;
  communicationRating: number;
  comment: string;
  date: string;
  workerReply?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image';
  imageUrl?: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: ChatMessage[];
}

export interface AgendaSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  bookingId?: string;
}

export interface Notification {
  id: string;
  type: 'job_request' | 'message' | 'review' | 'booking_update';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  linkTo?: string;
}

export interface ServiceCategoryItem {
  id: ServiceCategory;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}
