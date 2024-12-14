const express=require("express");
const cors=require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express();
require('dotenv').config();
const port=process.env.PORT || 3000

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dv2hq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

      // jobs related apis
      const jobsCollection = client.db('job-portal').collection('jobs');
      const jobApplicationCollection = client.db('job-portal').collection('job_applications');

      app.get('/jobs', async (req, res) => {
        const email = req.query.email;
        let query = {};
        if (email) {
            query = { hr_email: email }
        }
        const cursor = jobsCollection.find(query);
          const result = await cursor.toArray();
          res.send(result);
      });
     
      app.get('/jobs/:id', async (req, res) => {
        const id = req.params.id;
      
        // Check if id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: 'Invalid ID format' });
        }
      
        const query = { _id: new ObjectId(id) };
        const result = await jobsCollection.findOne(query);
        res.send(result);
      });
     app.post('/jobs', async (req,res)=>{
      const newJob=req.body;
      const result=await jobsCollection.insertOne(newJob);
      res.send(result)
     })
      
      //job-application
      //to get application count and my application
      app.post('/job-applications', async (req, res) => {
        const application = req.body;
        const result = await jobApplicationCollection.insertOne(application);

        // Not the best way (use aggregate) 
        // skip --> it
        const id = application.job_id;
        const query = { _id: new ObjectId(id) }
        const job = await jobsCollection.findOne(query);
        let newCount = 0;
        if (job.applicationCount) {
            newCount = job.applicationCount + 1;
        }
        else {
            newCount = 1;
        }

        // now update the job info
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
            $set: {
                applicationCount: newCount
            }
        }

        const updateResult = await jobsCollection.updateOne(filter, updatedDoc);

        res.send(result);
    });
   
    //to get all the applicant details
    app.get('/job-applications/jobs/:job_id', async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId }
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
  })

   //my application data section
    app.get('/job-application', async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email }
      const result = await jobApplicationCollection.find(query).toArray();
       // fokira way to aggregate data
       for (const application of result) {
        // console.log(application.job_id)
        const query1 = { _id: new ObjectId(application.job_id) }
        const job = await jobsCollection.findOne(query1);
        if (job) {
            application.title = job.title;
            application.location = job.location;
            application.company = job.company;
            application.company_logo = job.company_logo;
        }
    }
      res.send(result);
    })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send('job portal is running')                          
})

app.listen(port,()=>{
  console.log("job portal running aat",port)                            
})