import { User } from '@/models/user'
import { UserRepository } from '@/repositories/user-repository'

export class UserService {
  async findById(id: string): Promise<User | null> { return null }
}
