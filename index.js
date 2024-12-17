const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const verifyToken = (req, res, next) => {
  const token = req.cookies.SoloSphere_Token
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  //verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }

    req.user = decoded
    next()
  })
};

const uri = `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@tariqul-islam.mchvj.mongodb.net/?retryWrites=true&w=majority&appName=TARIQUL-ISLAM`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const jobsCollection = client.db('SoloSphere_DB').collection('Jobs')

    // Create a jwt token
    app.post('/jwt', (req, res) => {
      try {
        const userInfo = req.body
        const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.cookie('SoloSphere_Token', token, {
          httpOnly: true,
          secure: false
        }).send({ success: true })
      } catch (error) {
        return res.status(500).send({ message: error.code })
      }
    })

    //logout when not access jwt token
    app.post('/logout', (req, res) => {
      res.clearCookie('SoloSphere_Token', {
        httpOnly: true,
        secure: false
      }).send({ success: true })
    })

    // post a new job
    app.post('/post-job', async (req, res) => {
      const newJob = req.body
      const result = await jobsCollection.insertOne(newJob)
      res.send(result)
    })

    //get all jobs
    app.get('/jobs', async (req, res) => {
      const result = await jobsCollection.find().toArray()
      res.send(result)
    })

    //get a single job data
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })

    // get my posted jobs
    app.get('/my-posted-jobs', verifyToken, async (req, res) => {
      const { email } = req.query
      const query = { 'buyer.email': email }

      if (req?.user?.email !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })

    //update job data by id
    app.put('/update-job/:id', async (req, res) => {
      const id = req.params.id
      const jobData = req.body
      const updated = {
        $set: jobData
      }
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const result = await jobsCollection.updateOne(query, updated, options)
      res.send(result)
    })

    //delete my posted job
    app.delete('/my-posted-job/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.deleteOne(query)
      res.send(result)
    })

    await client.db('admin').command({ ping: 1 })
    console.log(
      '☘️  You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
