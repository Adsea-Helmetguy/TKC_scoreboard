import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

let matchState: unknown = null

app.get('/api/state', (_, res) => {
  res.json(matchState)
})

app.post('/api/state', (req, res) => {
  matchState = req.body
  res.json({ ok: true })
})

app.listen(3001, '0.0.0.0', () => {
  console.log('State server running on :3001')
})

/*
Installed:

npm install express cors
npm install -D @types/express @types/cors tsx
*/