// Load environment variables
require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
let db;
let patients;

async function connectToMongoDB() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        await client.connect();
        
        db = client.db('nector_hospital');
        patients = db.collection('patients');
        
        console.log('✅ Connected to MongoDB Atlas!');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ POST /patients - Add or Update patient
app.post('/patients', async (req, res) => {
    try {
        const newPatient = req.body;
        
        if (!newPatient.patientId || !newPatient.patientName || !newPatient.phoneNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if patient already exists
        const existingPatient = await patients.findOne({ patientId: newPatient.patientId });

        if (existingPatient) {
            // Update existing patient
            const result = await patients.updateOne(
                { patientId: newPatient.patientId },
                { $set: newPatient }
            );
            
            const updatedPatient = await patients.findOne({ patientId: newPatient.patientId });
            return res.status(200).json({ message: 'Patient updated', patient: updatedPatient });
        } else {
            // Add new patient
            const result = await patients.insertOne(newPatient);
            res.status(201).json({ message: 'Patient saved', patient: newPatient });
        }
    } catch (error) {
        console.error('Error processing POST /patients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ✅ GET /patients - Get all patients
app.get('/patients', async (req, res) => {
    try {
        const allPatients = await patients.find({}).toArray();
        res.json(allPatients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ✅ PUT /patients/:patientId - Update patient
app.put('/patients/:patientId', async (req, res) => {
    try {
        const patientId = req.params.patientId;
        const updatedPatient = req.body;

        const result = await patients.updateOne(
            { patientId: patientId },
            { $set: updatedPatient }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const patient = await patients.findOne({ patientId: patientId });
        res.json({ message: 'Patient updated', patient: patient });
    } catch (error) {
        console.error('Error updating patient:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ✅ Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'patient-list.html'));
});

// Start server
async function startServer() {
    await connectToMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running at: http://localhost:${PORT}`);
        console.log(`📊 MongoDB connected to: nector_hospital database`);
    });
}

startServer();
