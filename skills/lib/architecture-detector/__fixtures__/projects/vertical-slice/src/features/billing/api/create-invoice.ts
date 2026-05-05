import { Invoice } from './domain/invoice'
import { logger } from '@/shared/lib/logger'

export async function createInvoice(data: Partial<Invoice>): Promise<Invoice> {
  logger.info('Creating invoice')
  return { id: 'inv-1', amount: 0, currency: 'BRL', ...data }
}
