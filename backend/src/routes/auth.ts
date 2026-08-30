/** Sign in for the four staff-side roles — see store/authEngine.ts for
 * what this does and doesn't protect against, and store/account.ts for
 * the credential list every seeded demo account uses. */
import { Router } from 'express'
import { AuthError, login, logout } from '../store/authEngine.js'
import { toPublicAccount } from '../types/account.js'
import { requireAuth } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(422).json({ error: 'email and password are required.' })
  }
  try {
    const { account, token } = login(email, password)
    res.json({ account: toPublicAccount(account), token })
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
})

authRouter.post('/auth/logout', requireAuth, (req, res) => {
  const header = req.header('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
  if (token) logout(token)
  res.json({ status: 'ok' })
})

/** Lets the frontend restore a session on page reload by asking the
 * server who the stored token belongs to, rather than trusting a stored
 * account blob — the same "server is the source of truth" spirit as
 * everything else here (see queueEntries.ts's own docstring on why the
 * patient side always re-fetches instead of trusting cached state). */
authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ account: toPublicAccount(req.account!) })
})
