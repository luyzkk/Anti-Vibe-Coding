import { UserService } from '@/services/user-service'
import { User } from '@/models/user'

export class UserController {
  constructor(private service: UserService) {}
  async getUser(id: string): Promise<User | null> { return this.service.findById(id) }
}
