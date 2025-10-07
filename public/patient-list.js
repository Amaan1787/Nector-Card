let currentPatient = null;

// ============================
// 👉 CHARACTER COUNTER FOR ADDRESS FIELD
// ============================
document.addEventListener("DOMContentLoaded", function() {
    const addressField = document.getElementById("address");
    const charCounter = document.querySelector("small");
    
    if (addressField && charCounter) {
        // Update character count function
        function updateCharCount() {
            const currentLength = addressField.value.length;
            const maxLength = 60;
            charCounter.textContent = `${currentLength}/${maxLength} characters`;
            
            // Change color when approaching limit
            if (currentLength > 50) {
                charCounter.style.color = "#ff6b6b";
                charCounter.style.fontWeight = "bold";
            } else if (currentLength > 40) {
                charCounter.style.color = "#ff9800";
                charCounter.style.fontWeight = "normal";
            } else {
                charCounter.style.color = "#666";
                charCounter.style.fontWeight = "normal";
            }
        }
        
        // Set initial count
        updateCharCount();
        
        // Add all event listeners
        addressField.addEventListener("input", updateCharCount);
        addressField.addEventListener("keyup", updateCharCount);
        addressField.addEventListener("paste", function() {
            setTimeout(updateCharCount, 10);
        });
        addressField.addEventListener("keydown", updateCharCount);
    }
});

// Search patient
document.getElementById("cardForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const patientId = document.getElementById("patientId").value.trim();
    const messageDiv = document.getElementById("message");
    const patientDetails = document.getElementById("patientDetails");
    const generateCardBtn = document.getElementById("generateCardBtn");
    const canvasContainer = document.getElementById("canvasContainer");

    messageDiv.textContent = "";
    messageDiv.className = "message";
    patientDetails.style.display = "none";
    generateCardBtn.style.display = "none";
    canvasContainer.style.display = "none";

    if (!patientId) {
        messageDiv.textContent = "⚠️ Please enter a valid Patient ID.";
        messageDiv.classList.add("error");
        return;
    }

    try {
        const response = await fetch("/patients");
        if (!response.ok) throw new Error("Failed to load patient data.");
        const patients = await response.json();
        const data = patients.find((p) => p.patientId === patientId);

        if (!data) {
            messageDiv.textContent = "Patient not found. Please check the Patient ID.";
            messageDiv.classList.add("error");
            return;
        }

        messageDiv.textContent = "✅ Patient found successfully!";
        messageDiv.classList.add("success");
        setTimeout(() => {
            messageDiv.textContent = "";
            messageDiv.className = "message";
        }, 3000);

        currentPatient = data;

        document.getElementById("displayCardNo").innerText = data.cardNo || "N/A";
        document.getElementById("displayId").innerText = data.patientId;
        document.getElementById("displayName").innerText = data.patientName;
        document.getElementById("displayPhone").innerText = data.phoneNumber;
        document.getElementById("patientAddress").innerText = data.address || "Address not provided";
        document.getElementById("displayDiscount").innerText = data.discount + "%";
        document.getElementById("displayExpiry").innerText = data.validTill;

        document.getElementById("qrcode").innerHTML = "";
        new QRCode(document.getElementById("qrcode"), {
            text: `Patient ID: ${data.patientId}
Name: ${data.patientName}
Phone: ${data.phoneNumber}
Address: ${data.address || "Address not provided"}
Discount: ${data.discount}%
Valid Till: ${data.validTill}`,
            width: 120,
            height: 120,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H,
        });

        document.getElementById("downloadBtn").style.display = "inline-block";
        document.getElementById("shareBtn").style.display = "inline-block";
        document.getElementById("editBtn").style.display = "inline-block";
        patientDetails.style.display = "block";
        generateCardBtn.style.display = "inline-block";
    } catch (error) {
        messageDiv.textContent = "❌ Error: " + error.message;
        messageDiv.classList.add("error");
    }
});

// Edit patient
document.getElementById("editBtn").addEventListener("click", () => {
    if (!currentPatient) return;
    const editForm = document.getElementById("editForm");
    editForm.style.display = "block";

    document.getElementById("editName").value = currentPatient.patientName || "";
    document.getElementById("editPhone").value = currentPatient.phoneNumber || "";
    document.getElementById("editDiscount").value = currentPatient.discount || "";
    document.getElementById("editExpiry").value = currentPatient.validTill || "";
    
    const addressField = document.getElementById("address");
    if (addressField) {
        addressField.value = currentPatient.address || "";
        
        // Update character counter
        const charCounter = document.querySelector("small");
        if (charCounter) {
            const currentLength = addressField.value.length;
            charCounter.textContent = `${currentLength}/60 characters`;
        }
    }

    editForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Save changes
document.getElementById("saveEditBtn").addEventListener("click", async () => {
    if (!currentPatient) return;

    const updatedPatient = {
        patientName: document.getElementById("editName").value.trim(),
        phoneNumber: document.getElementById("editPhone").value.trim(),
        address: document.getElementById("address").value.trim(),
        discount: parseInt(document.getElementById("editDiscount").value.trim()),
        validTill: document.getElementById("editExpiry").value,
    };

    // Validation
    if (!updatedPatient.patientName || !updatedPatient.phoneNumber || 
        !updatedPatient.discount || !updatedPatient.validTill) {
        alert("⚠️ Please fill in all required fields!");
        return;
    }

    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(updatedPatient.phoneNumber)) {
        alert("⚠️ Phone number must be exactly 10 digits!");
        return;
    }

    if (updatedPatient.address && updatedPatient.address.length > 60) {
        alert("⚠️ Address cannot exceed 60 characters!");
        return;
    }

    if (updatedPatient.discount < 1 || updatedPatient.discount > 100) {
        alert("⚠️ Discount must be between 1 and 100!");
        return;
    }

    try {
        const res = await fetch(`/patients/${currentPatient.patientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPatient),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Update failed: ${errorText}`);
        }
        
        alert("✅ Patient updated successfully!");
        document.getElementById("editForm").style.display = "none";
        document.getElementById("cardForm").dispatchEvent(new Event("submit"));
        
    } catch (err) {
        console.error("Save error:", err);
        alert("❌ Error updating patient: " + err.message);
    }
});

// Download card
document.getElementById("downloadBtn").addEventListener("click", function () {
    const card = document.getElementById("loyaltyCard");
    html2canvas(card).then((canvas) => {
        const link = document.createElement("a");
        link.download = `loyalty-card-${currentPatient.patientId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
});

// Share card
document.getElementById("shareBtn").addEventListener("click", () => {
    const card = document.getElementById("loyaltyCard");
    html2canvas(card).then(async (canvas) => {
        canvas.toBlob(async (blob) => {
            const file = new File([blob], "loyalty-card.png", { type: "image/png" });
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Nector Hospital Loyalty Card",
                        text: "Here is your loyalty card.",
                        files: [file],
                    });
                } catch (err) {
                    if (err.name !== "AbortError") {
                        alert("Error sharing: " + err.message);
                    }
                }
            } else {
                alert("Sharing not supported in this browser.");
            }
        });
    });
});

// ============================
// 👉 CANVAS CARD GENERATION WITH 30+30 ADDRESS SPLIT
// ============================
const generateCardBtn = document.getElementById("generateCardBtn");
const cardCanvas = document.getElementById("cardCanvas");
const canvasContainer = document.getElementById("canvasContainer");
const closeCanvasBtn = document.getElementById("closeCanvasBtn");

if (cardCanvas) {
    const ctx = cardCanvas.getContext("2d");
    const templateImage = new Image();
    templateImage.src = "card.jpg";

    // 🔥 FIXED: 30+30 character address splitting function
    function splitAddress(address) {
        if (!address || address.length <= 30) {
            return { line1: address || "Address not provided", line2: "" };
        }

        // 🎯 30 characters for first line, 30 for second line
        let splitPoint = address.lastIndexOf(" ", 30);
        if (splitPoint === -1) splitPoint = 30; // Hard split if no space found

        return {
            line1: address.substring(0, splitPoint).trim(),
            line2: address.substring(splitPoint).trim()
        };
    }

    function drawPatientCard(patient) {
        canvasContainer.style.display = "block";
        ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);

        if (templateImage.complete && templateImage.naturalWidth !== 0) {
            ctx.drawImage(templateImage, 0, 0, cardCanvas.width, cardCanvas.height);
        } else {
            ctx.fillStyle = "#f0f0f0";
            ctx.fillRect(0, 0, cardCanvas.width, cardCanvas.height);
        }

        ctx.font = "18px Arial";
        ctx.fillStyle = "#000";
        ctx.fillText(patient.patientId, 500, 188);
        ctx.fillText(patient.patientName, 500, 235);
        ctx.fillText(patient.phoneNumber, 500, 280);

        // 🎯 30+30 character address splitting
        const addressLines = splitAddress(patient.address);
        ctx.fillText(addressLines.line1, 480, 330);  // First 30 characters
        if (addressLines.line2) {
            ctx.fillText(addressLines.line2, 480, 355);  // Next 30 characters
        }

        ctx.font = "bold 16px Arial";
        ctx.fillText(`Discount: ${patient.discount}%`, 455, 400);
        ctx.fillText(`Valid Till: ${patient.validTill}`, 455, 425);

        // Show canvas buttons
        const downloadBtn = document.getElementById("downloadCanvasBtn");
        const shareBtn = document.getElementById("shareCanvasBtn");
        if (downloadBtn) downloadBtn.style.display = "inline-block";
        if (shareBtn) shareBtn.style.display = "inline-block";

        canvasContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    generateCardBtn.addEventListener("click", () => {
        if (currentPatient) {
            drawPatientCard(currentPatient);
        } else {
            alert("⚠️ No patient data available. Please search for a patient first.");
        }
    });

    closeCanvasBtn.addEventListener("click", () => {
        canvasContainer.style.display = "none";
    });

    // Canvas download
    document.getElementById("downloadCanvasBtn").addEventListener("click", function () {
        const imgURI = cardCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = imgURI;
        a.download = "nector_patient_card.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    // Canvas share
    document.getElementById("shareCanvasBtn").addEventListener("click", async function () {
        try {
            const originalText = this.innerHTML;
            this.innerHTML = "📤 Sharing...";
            this.disabled = true;

            cardCanvas.toBlob(async (blob) => {
                try {
                    const file = new File([blob], "nector-patient-card.png", { type: "image/png" });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: "Patient Card - Nector Hospital",
                            text: "Here is the patient card from Nector Hospital.",
                            files: [file],
                        });
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "nector-patient-card.png";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        alert("Card downloaded!");
                    }
                } finally {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            }, "image/png", 0.9);
        } catch (error) {
            console.error("Error:", error);
            alert("Error sharing card.");
            this.innerHTML = originalText;
            this.disabled = false;
        }
    });
}
