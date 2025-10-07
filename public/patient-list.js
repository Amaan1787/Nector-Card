let currentPatient = null;

// Search patient
document
  .getElementById("cardForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const patientId = document.getElementById("patientId").value.trim();
    const messageDiv = document.getElementById("message");
    const patientDetails = document.getElementById("patientDetails");
    const generateCardBtn = document.getElementById("generateCardBtn");
    const canvasContainer = document.getElementById("canvasContainer");

    // Reset UI
    messageDiv.textContent = "";
    messageDiv.className = "message";
    patientDetails.style.display = "none";
    patientDetails.classList.remove("active");
    generateCardBtn.style.display = "none";
    canvasContainer.style.display = "none";

    // Validate input
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
        // Patient not found - show error message
        messageDiv.textContent =
          "Patient not found. Please check the Patient ID.";
        messageDiv.classList.add("error");

        // Hide action buttons
        document.getElementById("downloadBtn").style.display = "none";
        document.getElementById("shareBtn").style.display = "none";
        document.getElementById("editBtn").style.display = "none";
        return;
      }

      // Patient found - show success message
      messageDiv.textContent = "✅ Patient found successfully!";
      messageDiv.classList.add("success");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        messageDiv.textContent = "";
        messageDiv.className = "message";
      }, 3000);

      currentPatient = data;

      // Update UI
      document.getElementById("displayCardNo").innerText = data.cardNo || "N/A";
      document.getElementById("displayId").innerText = data.patientId;
      document.getElementById("displayName").innerText = data.patientName;
      document.getElementById("displayPhone").innerText = data.phoneNumber;
      document.getElementById("patientAddress").innerText =
        data.address || "!Not Provided";
      document.getElementById("displayDiscount").innerText =
        data.discount + "%";
      document.getElementById("displayExpiry").innerText = data.validTill;

      // Generate QR Code
      document.getElementById("qrcode").innerHTML = "";
      new QRCode(document.getElementById("qrcode"), {
        text: `Patient ID: ${data.patientId}
        Name: ${data.patientName}
        Phone: ${data.phoneNumber}
        Address: ${data.address || "Not Provided"}
        Discount: ${data.discount}%
        Valid Till: ${data.validTill}`,
        width: 120,
        height: 120,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });

      // Show action buttons
      document.getElementById("downloadBtn").style.display = "inline-block";
      document.getElementById("shareBtn").style.display = "inline-block";
      document.getElementById("editBtn").style.display = "inline-block";
      patientDetails.style.display = "block";
      patientDetails.classList.add("active");

      // Show Generate Card button
      generateCardBtn.style.display = "inline-block";
    } catch (error) {
      messageDiv.textContent = "❌ Error: " + error.message;
      messageDiv.classList.add("error");
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

// Edit patient
document.getElementById("editBtn").addEventListener("click", () => {
  if (!currentPatient) return;
  const editForm = document.getElementById("editForm");
  editForm.style.display = "block";
  editForm.classList.add("active");
  document.getElementById("editName").value = currentPatient.patientName;
  document.getElementById("editPhone").value = currentPatient.phoneNumber;
  document.getElementById("editDiscount").value = currentPatient.discount;
  document.getElementById("editExpiry").value = currentPatient.validTill;
  document.getElementById("editAddress").value = currentPatient.address || "";

  // Scroll to edit form
  editForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Save changes
document.getElementById("saveEditBtn").addEventListener("click", async () => {
  if (!currentPatient) return;

  const updatedPatient = {
    patientName: document.getElementById("editName").value.trim(),
    phoneNumber: document.getElementById("editPhone").value.trim(),
    address: document.getElementById("editAddress").value.trim(),
    discount: parseInt(document.getElementById("editDiscount").value.trim()),
    validTill: document.getElementById("editExpiry").value,
  };

  // Validate updated data
  if (
    !updatedPatient.patientName ||
    !updatedPatient.phoneNumber ||
    !updatedPatient.discount ||
    !updatedPatient.validTill
  ) {
    alert("⚠️ Please fill in all fields!");
    return;
  }

  // Validate phone number (10 digits)
  const phonePattern = /^[0-9]{10}$/;
  if (!phonePattern.test(updatedPatient.phoneNumber)) {
    alert("⚠️ Phone number must be exactly 10 digits!");
    return;
  }

  // Validate address length
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
    if (!res.ok) throw new Error("Update failed");
    alert("✅ Patient updated successfully!");
    const editForm = document.getElementById("editForm");
    editForm.style.display = "none";
    editForm.classList.remove("active");

    // Reload data after update
    document.getElementById("cardForm").dispatchEvent(new Event("submit"));
  } catch (err) {
    alert("❌ Error updating patient: " + err.message);
  }
});

// ============================
// 👉 Generate Card Feature
// ============================
const generateCardBtn = document.getElementById("generateCardBtn");
const cardCanvas = document.getElementById("cardCanvas");
const canvasContainer = document.getElementById("canvasContainer");
const closeCanvasBtn = document.getElementById("closeCanvasBtn");
const ctx = cardCanvas.getContext("2d");
const templateImage = new Image();
templateImage.src = "card.jpg"; // Make sure this path is correct

// Address splitting function for 2-line display
function splitAddress(address) {
  if (!address || address.length <= 30) {
    return { line1: address || "Not provided", line2: "" };
  }

  // Find best split point (prefer word boundary)
  let splitPoint = address.lastIndexOf(" ", 30);
  if (splitPoint === -1) splitPoint = 30;

  return {
    line1: address.substring(0, splitPoint).trim(),
    line2: address.substring(splitPoint).trim(),
  };
}

function drawPatientCard(patient) {
  canvasContainer.style.display = "block";
  ctx.clearRect(0, 0, cardCanvas.width, cardCanvas.height);

  // Draw background
  if (templateImage.complete && templateImage.naturalWidth !== 0) {
    ctx.drawImage(templateImage, 0, 0, cardCanvas.width, cardCanvas.height);
  } else {
    // Fallback background if image not loaded
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, cardCanvas.width, cardCanvas.height);
  }

  // Draw patient details with updated positioning for new card
  ctx.font = "18px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText(patient.patientId, 500, 188);
  ctx.fillText(patient.patientName, 500, 235);
  ctx.fillText(patient.phoneNumber, 500, 280);

  // Address - 2 lines with smart splitting
  const addressLines = splitAddress(patient.address || "Not provided");
  ctx.fillText(addressLines.line1, 480, 330); // Line 1
  if (addressLines.line2) {
    ctx.fillText(addressLines.line2, 480, 355); // Line 2
  }

  ctx.font = "bold 16px Arial";
  ctx.fillText(`Discount: ${patient.discount}%`, 455, 400);
  ctx.fillText(`Valid Till: ${patient.validTill}`, 455, 425);

  // Show canvas buttons - NEW
  showCanvasButtons();

  // Scroll to canvas
  canvasContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Generate card on button click
generateCardBtn.addEventListener("click", () => {
  if (currentPatient) {
    drawPatientCard(currentPatient);
  } else {
    alert("⚠️ No patient data available. Please search for a patient first.");
  }
});

// Close canvas on X button click
closeCanvasBtn.addEventListener("click", () => {
  canvasContainer.style.display = "none";
});

// ============================
// 👉 Canvas Button Functions - NEW
// ============================

// Show canvas buttons when card is generated
function showCanvasButtons() {
  document.getElementById("downloadCanvasBtn").style.display = "inline-block";
  document.getElementById("shareCanvasBtn").style.display = "inline-block";
}

// Canvas Download functionality
document
  .getElementById("downloadCanvasBtn")
  .addEventListener("click", function () {
    const canvas = document.getElementById("cardCanvas");
    const imgURI = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = imgURI;
    a.download = "nector_patient_card.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

// Canvas Share functionality
document
  .getElementById("shareCanvasBtn")
  .addEventListener("click", async function () {
    const canvas = document.getElementById("cardCanvas");

    try {
      // Show loading state
      const originalText = this.innerHTML;
      this.innerHTML = "📤 Sharing...";
      this.disabled = true;

      // Convert canvas to blob
      canvas.toBlob(
        async (blob) => {
          try {
            const file = new File([blob], "nector-patient-card.png", {
              type: "image/png",
            });

            // Check if Web Share API is supported
            if (
              navigator.share &&
              navigator.canShare &&
              navigator.canShare({ files: [file] })
            ) {
              await navigator.share({
                title: "Patient Card - Nector Hospital",
                text: "Here is the patient card from Nector Hospital.",
                files: [file],
              });
            } else {
              // Fallback: Create download link for desktop
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "nector-patient-card.png";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              alert("Card downloaded! (Sharing not supported on this device)");
            }
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Error sharing:", error);
              alert("Error sharing card. Please try again.");
            }
          } finally {
            // Restore button state
            this.innerHTML = originalText;
            this.disabled = false;
          }
        },
        "image/png",
        0.9
      );
    } catch (error) {
      console.error("Error creating image:", error);
      alert("Error creating card image. Please try again.");

      // Restore button state
      this.innerHTML = originalText;
      this.disabled = false;
    }
  });
