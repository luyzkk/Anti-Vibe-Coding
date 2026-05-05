import { OnboardingStep } from './domain/step'
import { logger } from '@/shared/lib/logger'

export async function startOnboarding(userId: string): Promise<OnboardingStep[]> {
  logger.info('Starting onboarding for', userId)
  return []
}
