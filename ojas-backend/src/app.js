import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import connectDB from './config/db.js'
import deviceRoutes from './routes/device.routes.js'
import authRoutes from './routes/auth.routes.js'
import telemetryRoutes from './routes/telemetry.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { getMqttClient } from './config/mqtt.js'
import { requestLogger } from './middleware/request-logger.middleware.js'
import passport, { configurePassport } from './config/passport.js'

const app = express()

const corsOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173,http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}))
app.use(express.json())
app.use(requestLogger)
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
  })
)
configurePassport()
app.use(passport.initialize())
app.use(passport.session())

// Connect to MongoDB
connectDB()
getMqttClient()

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables')
}

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OJAS Backend is running',
    version: '1.0.0',
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/auth', authRoutes)
app.use('/api/devices', deviceRoutes)
app.use('/api/telemetry', telemetryRoutes)
app.use('/api/admin', adminRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

export default app
