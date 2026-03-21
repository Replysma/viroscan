/**
 * Auth helpers using Clerk.
 * userRepo est maintenant async → on await tous les appels.
 */

import { auth } from '@clerk/nextjs/server'
import { userRepo } from './db'

export interface AuthContext {
  userId: string
  plan: 'free' | 'premium'
}

export async function getAuth(): Promise<AuthContext | null> {
  const { userId } = await auth()
  if (!userId) return null

  try {
    let user = await userRepo.findById(userId)
    if (!user) {
      user = await userRepo.create({ id: userId, plan: 'free' })
    }
    return { userId, plan: user.plan }
  } catch (err) {
    console.error('[auth] Erreur DB, plan free par défaut :', err)
    return { userId, plan: 'free' }
  }
}
