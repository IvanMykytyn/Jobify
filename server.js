// can use import because of "type": "module"
import express from 'express'
const app = express()
import dotenv from 'dotenv'
dotenv.config()

// in order not to write every time try catch
import 'express-async-errors'

import morgan from 'morgan'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import path from 'path'

import helmet from 'helmet'
import xss from 'xss-clean'
import mongoSanitize from 'express-mongo-sanitize'

// db
import connectDB from './db/connect.js'

// routers
import authRouter from './routes/authRoutes.js'
import jobsRouter from './routes/jobsRoutes.js'

// middleware
import notFoundMiddleware from './middleware/not-found.js'
import errorHandlerMiddleware from './middleware/error-handler.js'
import authenticateUser from './middleware/auth.js'

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

const __dirname = dirname(fileURLToPath(import.meta.url))

// only when ready to deploy
// set static assets
app.use(express.static(path.resolve(__dirname, './client/build')))

// to recognize the incoming request Object as a JSON Object
app.use(express.json())
 

// helmet Helmet helps you secure your Express apps by setting various HTTP headers.
app.use(helmet())
// xss-clean Node.js Connect middleware to sanitize user input coming from POST body, GET queries, and url params.
app.use(xss())
// express-mongo-sanitize Sanitizes user-supplied data to prevent MongoDB Operator Injection.
app.use(mongoSanitize())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/jobs', authenticateUser, jobsRouter)

// only when ready to deploy
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './client/build', 'index.html'))
})

app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

const port = process.env.PORT || 5000

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URL)
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`)
    })
  } catch (error) {
    console.log(error)
  }
}

start()
