import { Invoice } from '../domain/invoice'
import { Button } from '@/shared/ui/button'

export function InvoiceForm({ onSubmit }: { onSubmit: (data: Partial<Invoice>) => void }) {
  return <form onSubmit={() => onSubmit({})}><Button>Submit</Button></form>
}
