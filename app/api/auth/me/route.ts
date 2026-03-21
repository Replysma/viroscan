import { NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth'
import { userRepo } from '@/lib/db'

export async function GET(request: Request) {
  const auth = getAuthFromRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const user = userRepo.findById(auth.userId)
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({
    success: true,
    data: { id: user.id, email: user.email, plan: user.plan },
  })
}
