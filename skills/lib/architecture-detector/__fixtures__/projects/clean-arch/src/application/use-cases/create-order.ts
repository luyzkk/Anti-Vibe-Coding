import { Order } from '@/domain/aggregates/order'
import { OrderRepository } from '../ports/order-repository'

export class CreateOrderUseCase {
  constructor(private repo: OrderRepository) {}
  execute(data: Partial<Order>): Order { return { ...new Order(), ...data } }
}
