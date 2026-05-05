import { User } from '@/models/user'

export function renderUser(user: User): string { return JSON.stringify(user) }
