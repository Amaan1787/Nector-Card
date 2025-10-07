const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Path to JSON file
const dataFilePath = path.join(__dirname, "patient.json");

// Read patient data
function readData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      return [];
    }
    const data = fs.readFileSync(dataFilePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading JSON file:", err);
    return [];
  }
}

// Write patient data
function writeData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing JSON file:", err);
    throw err;
  }
}

// ✅ POST /patients - Add or Update patient (prevent duplicates)
app.post("/patients", (req, res) => {
  try {
    const newPatient = req.body;

    if (
      !newPatient.patientId ||
      !newPatient.patientName ||
      !newPatient.phoneNumber
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Additional validation for address length
    if (newPatient.address && newPatient.address.length > 60) {
      return res
        .status(400)
        .json({ error: "Address cannot exceed 60 characters" });
    }

    let currentData = readData();

    // 🔎 Check if patient already exists
    const existingIndex = currentData.findIndex(
      (p) => p.patientId === newPatient.patientId
    );

    if (existingIndex !== -1) {
      // If exists → update
      currentData[existingIndex] = {
        ...currentData[existingIndex],
        ...newPatient,
      };
      writeData(currentData);
      return res
        .status(200)
        .json({
          message: "Patient updated",
          patient: currentData[existingIndex],
        });
    }

    // Else add new
    currentData.push(newPatient);
    writeData(currentData);

    res.status(201).json({ message: "Patient saved", patient: newPatient });
  } catch (error) {
    console.error("Error processing POST /patients:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /patients - Get all patients
app.get("/patients", (req, res) => {
  const currentData = readData();
  res.json(currentData);
});

// PUT /patients/:patientId - Update patient
app.put("/patients/:patientId", (req, res) => {
  try {
    const patientId = req.params.patientId;
    const updatedPatient = req.body;

    const currentData = readData();
    const index = currentData.findIndex((p) => p.patientId === patientId);

    if (index === -1) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Merge old + new data
    currentData[index] = { ...currentData[index], ...updatedPatient };
    writeData(currentData);

    res.json({ message: "Patient updated", patient: currentData[index] });
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "patient-list.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});
