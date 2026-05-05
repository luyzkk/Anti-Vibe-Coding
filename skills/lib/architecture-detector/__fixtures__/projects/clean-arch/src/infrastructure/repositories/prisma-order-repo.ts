import type { OrderRepository } from '@/application/ports/order-repository'
import type { Order } from '@/domain/aggregates/order'

export class PrismaOrderRepo implements OrderRepository {
  async save(order: Order): Promise<void> { /* prisma.order.create */ }
  async findById(id: string): Promise<Order | null> { return null }
}
