import { CreateOrderUseCase } from '@/application/use-cases/create-order'

export class OrderController {
  constructor(private useCase: CreateOrderUseCase) {}
  async create(data: unknown) { return this.useCase.execute(data as any) }
}
