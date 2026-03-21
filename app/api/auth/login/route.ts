/**
 * POST /api/auth/login
 * Body: { email, password }
 */

import { NextResponse } from 'next/server'
import { userRepo } from '@/lib/db'
import { comparePassword, signToken, createAuthCookieHeader } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    const user = userRepo.findByEmail(email.toLowerCase())
    if (!user || !comparePassword(password, user.password)) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ userId: user.id, email: user.email, plan: user.plan })

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, plan: user.plan },
    })

    response.headers.set('Set-Cookie', createAuthCookieHeader(token))
    return response
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
