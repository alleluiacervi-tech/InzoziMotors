import type { Conversation } from '@/lib/types'

/** What a conversation row needs to render, from the current user's point of
 *  view — the buyer/seller split collapsed into "the other person". */
export interface ConversationView {
  id: string
  otherId: string
  otherName: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
  carId: string | null
  /** The thread is about a rental car instead (opened by an availability request). */
  rentalCarId: string | null
  carTitle: string | null
  carImage: string | null
}

export function viewOf(conv: Conversation, myId: string): ConversationView {
  const iAmBuyer = conv.buyer_id === myId
  return {
    id: conv.id,
    otherId: iAmBuyer ? conv.seller_id : conv.buyer_id,
    otherName: (iAmBuyer ? conv.seller_name : conv.buyer_name) || '',
    lastMessage: conv.last_message ?? null,
    lastMessageAt: conv.last_message_at ?? null,
    unread: Number(conv.unread_count || 0),
    carId: conv.car_id ?? null,
    rentalCarId: conv.rental_car_id ?? null,
    carTitle: conv.car_title ?? null,
    carImage: conv.car_images?.[0] ?? null,
  }
}
