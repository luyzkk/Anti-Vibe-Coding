import type { Profile } from "../types";

/** Mock file contents indexed by file path, used in sampleImports tests. */

export const FILES_CLEAN_ARCH: Record<string, string> = {
  "src/application/use-cases/create-order.ts": `
import { Order } from '@/domain/aggregates/order'
import { OrderRepository } from '@/domain/repositories/order-repository'

export class CreateOrderUseCase { /* ... */ }
`,
  "src/presentation/controllers/order-controller.ts": `
import { CreateOrderUseCase } from '@/application/use-cases/create-order'
export class OrderController { /* ... */ }
`,
  "src/domain/aggregates/order.ts": `
import { Money } from '../value-objects/money'
export class Order { /* ... */ }
`,
  "src/infrastructure/repositories/order-repo.ts": `
import { OrderRepository } from '@/domain/repositories/order-repository'
import { Order } from '@/domain/aggregates/order'
export class SqlOrderRepository implements OrderRepository { /* ... */ }
`,
  "src/infrastructure/adapters/payment-gateway.ts": `
import { PaymentPort } from '@/domain/ports/payment-port'
export class StripeGateway implements PaymentPort { /* ... */ }
`,
};

export const FILES_NEXTJS: Record<string, string> = {
  "src/app/(dashboard)/page.tsx": `
'use client'
import { redirect } from 'next/navigation'
export default function Page() { /* ... */ }
`,
  "src/app/api/health/route.ts": `
import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ ok: true }) }
`,
  "src/components/button.tsx": `
import React from 'react'
export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>
}
`,
};

export const FILES_VERTICAL_SLICE: Record<string, string> = {
  "src/features/billing/domain/invoice.ts": `
import type { Money } from '@/shared/types/money'
export interface Invoice { id: string; amount: Money }
`,
  "src/features/billing/api/billing-router.ts": `
import { Invoice } from '../domain/invoice'
import { sharedDb } from '@/shared/lib/db'
export const billingRouter = { /* ... */ }
`,
  "src/features/auth/domain/user.ts": `
import { hashPassword } from '@/shared/lib/crypto'
export interface User { id: string; email: string }
`,
  "src/shared/lib/date-utils.ts": `
export function formatDate(d: Date): string { return d.toISOString() }
`,
};

export const FILES_MVC_FLAT: Record<string, string> = {
  "src/controllers/order-controller.ts": `
import { OrderService } from '@/services/order-service'
import { Order } from '@/models/order'
export class OrderController { /* ... */ }
`,
  "src/models/order.ts": `
export class Order { id: string = ''; total: number = 0 }
`,
  "src/services/order-service.ts": `
import { Order } from '@/models/order'
import { OrderRepository } from '@/repositories/order-repository'
export class OrderService { /* ... */ }
`,
  "src/views/order-view.ts": `
import { Order } from '../models/order'
export function renderOrder(order: Order): string { return JSON.stringify(order) }
`,
};

/** Divergent fixture: folder signals = mvc-flat, imports signal clean-arch */
export const FILES_DIVERGENTE: Record<string, string> = {
  "src/controllers/order-controller.ts": `
import { CreateOrderUseCase } from '@/application/use-cases/create-order'
import { Order } from '@/domain/aggregates/order'
export class OrderController { /* ... */ }
`,
};

/** Type alias for callers that need a typed record */
export type SampleFiles = Record<string, string>;

/** All fixture sets indexed by profile — convenience for generic tests */
export const FILES_BY_PROFILE: Partial<Record<Profile, SampleFiles>> = {
  "clean-architecture-ritual": FILES_CLEAN_ARCH,
  "nextjs-app-router": FILES_NEXTJS,
  "vertical-slice": FILES_VERTICAL_SLICE,
  "mvc-flat": FILES_MVC_FLAT,
};
