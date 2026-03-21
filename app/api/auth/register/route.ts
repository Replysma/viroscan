/**
 * POST /api/auth/register
 * Body: { email, password }
 */

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { userRepo } from '@/lib/db'
import { hashPassword, signToken, createAuthCookieHeader } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check existing user
    const existing = userRepo.findByEmail(email.toLowerCase())
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 })
    }

    // Create user
    const user = userRepo.create({
      id: uuidv4(),
      email: email.toLowerCase(),
      password: hashPassword(password),
      plan: 'free',
    })

    // Sign JWT
    const token = signToken({ userId: user.id, email: user.email, plan: user.plan })

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, plan: user.plan },
    }, { status: 201 })

    response.headers.set('Set-Cookie', createAuthCookieHeader(token))
    return response
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
