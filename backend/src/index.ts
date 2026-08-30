import cors from 'cors'
import express from 'express'
import { adminRouter } from './routes/admin.js'
import { appointmentsRouter } from './routes/appointments.js'
import { authRouter } from './routes/auth.js'
import { catalogRouter } from './routes/catalog.js'
import { dashboardRouter } from './routes/dashboard.js'
import { queueEntriesRouter } from './routes/queueEntries.js'
import { sessionsRouter } from './routes/sessions.js'
import { staffRouter } from './routes/staff.js'
import { resetStore } from './store/store.js'
import { seedDemoData } from './store/seed.js'

const app = express()
const PORT = Number(process.env.PORT) || 4000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api', catalogRouter)
app.use('/api', authRouter)
app.use('/api', sessionsRouter)
app.use('/api', queueEntriesRouter)
app.use('/api', appointmentsRouter)
app.use('/api', staffRouter)
app.use('/api', dashboardRouter)
app.use('/api', adminRouter)

/** Demo-only convenience: rebuild the seed data from scratch on demand,
 * so a messed-up demo state (mid-presentation, mid-testing) is one call
 * away from clean again instead of a server restart. Not something a
 * real product would ever expose. */
app.post('/api/demo/reset', (_req, res) => {
  resetStore()
  seedDemoData()
  res.json({ status: 'reset' })
})

// Fallback error handler — QueueEngineError cases are already caught and
// mapped to a proper status in each route; anything reaching here is a
// genuine bug, logged server-side, never detailed to the client.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong.' })
})

resetStore()
seedDemoData()

app.listen(PORT, () => {
  console.log(`VisitNow backend running on http://localhost:${PORT}`)
})
