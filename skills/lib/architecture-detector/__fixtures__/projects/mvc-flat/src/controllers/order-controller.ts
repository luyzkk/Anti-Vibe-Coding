import { OrderService } from '@/services/order-service'
import { Order } from '@/models/order'

export class OrderController {
  constructor(private service: OrderService) {}
  async create(data: Partial<Order>): Promise<Order> { return this.service.create(data) }
}
