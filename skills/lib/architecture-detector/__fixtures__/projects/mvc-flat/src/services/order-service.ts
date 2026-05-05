import { Order } from '@/models/order'

export class OrderService {
  async create(data: Partial<Order>): Promise<Order> { return { ...new Order(), ...data } }
}
