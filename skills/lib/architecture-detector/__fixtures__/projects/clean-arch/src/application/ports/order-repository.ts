import type { Order } from '@/domain/aggregates/order'
export interface OrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
}
