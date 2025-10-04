class NectorHospitalCardGenerator {
  constructor() {
    this.form = document.getElementById("cardForm");
    this.canvas = document.getElementById("loyaltyCard");
    this.ctx = this.canvas.getContext("2d");
    this.templateImage = new Image();
    this.templateImage.crossOrigin = "anonymous";
    this.downloadBtn = document.getElementById("downloadBtn");
    this.messageBox = document.getElementById("messageBox");
    this.downloadBtn.style.display = "none";
    this.messageBox.style.display = "none";
    this.preventOverwrite = false;

    this.templateImage.onload = () => {
      if (!this.preventOverwrite) {
        this.drawDefaultCard();
      }
    };
    this.templateImage.onerror = () => this.drawFallbackCard();
    this.templateImage.src = "card.jpg";

    document
      .getElementById("generateBtn")
      .addEventListener("click", (e) => this.handleFormSubmit(e));
    this.downloadBtn.addEventListener("click", () => this.downloadCard());
  }

  async handleFormSubmit(event) {
    event.preventDefault();

    const patientId = this.form.patientId.value.trim();
    const patientName = this.form.patientName.value.trim();
    const phoneNumber = this.form.phoneNumber.value.trim();
    const discount = this.form.discountPercent.value;

    if (!patientId || !patientName || !phoneNumber || !discount) {
      this.showMessage("Please fill all required fields.", true);
      return;
    }
    // Phone number validation (must be exactly 10 digits)
    const phonePattern = /^[0-9]{10}$/;
    if (!phonePattern.test(phoneNumber)) {
      this.showMessage("⚠️ Invalid Phone number.", true);
      return;
    }


    const patientCard = {
      cardNo: "CARD-" + Date.now(),
      patientId,
      patientName,
      phoneNumber,
      discount,
      validTill: this.generateExpiryDate(),
    };

    this.preventOverwrite = true;
    this.drawCard(patientCard);
    this.downloadBtn.style.display = "inline-block";
    this.showMessage("Patient Card ready! Save or download.", false);

    // Send to backend (but don’t break UI if it fails)
    try {
      const res = await fetch("http://localhost:3000/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientCard),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      // ✅ Differentiate between "saved" and "updated"
      if (data.message.includes("updated")) {
        this.showMessage("✅ Patient already exists, details updated!", false);
      } else {
        this.showMessage("✅ New patient saved successfully!", false);
      }

    } catch (err) {
      this.showMessage("⚠️ Data not saved to file! " + err.message, true);
    }

  }

  drawDefaultCard() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.templateImage.complete && this.templateImage.naturalWidth !== 0) {
      this.ctx.drawImage(
        this.templateImage,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
    }
    this.ctx.font = "italic 16px Arial";
    this.ctx.fillStyle = "#aaa";
    this.ctx.fillText("Fill the form to generate the card", 20, 180);
  }

  drawFallbackCard() {
    this.ctx.fillStyle = "#eee";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = "bold 24px Arial";
    this.ctx.fillStyle = "#333";
    this.ctx.fillText("Nector Hospital Card", 20, 50);
  }

  drawCard(cardData) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.templateImage.complete && this.templateImage.naturalWidth !== 0) {
      this.ctx.drawImage(
        this.templateImage,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
    } else {
      this.drawFallbackCard();
    }
    this.ctx.font = "20px Arial";
    this.ctx.fillStyle = "#000";
    this.ctx.fillText(cardData.patientId, 560, 190);
    this.ctx.fillText(cardData.patientName, 560, 260);
    this.ctx.fillText(cardData.phoneNumber, 560, 340);
    this.ctx.font = "bold 16px Arial";
    this.ctx.fillText(`Discount UPTO: ${cardData.discount}%`, 450, 400);
    this.ctx.fillText(`Valid Till: ${cardData.validTill}`, 450, 430);
  }

  generateExpiryDate() {
    let today = new Date();
    let nextYear = new Date(
      today.getFullYear() + 1,
      today.getMonth(),
      today.getDate()
    );
    return nextYear.toISOString().split("T")[0];
  }

  downloadCard() {
    const imgURI = this.canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = imgURI;
    a.download = "nector_loyalty_card.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  showMessage(msg, isError = false) {
    if (!this.messageBox) return;
    this.messageBox.textContent = msg;
    this.messageBox.style.color = isError ? "red" : "green";
    this.messageBox.style.display = "block";
    setTimeout(() => {
      this.messageBox.style.display = "none";
    }, 2500);
  }
}
window.addEventListener(
  "DOMContentLoaded",
  () => new NectorHospitalCardGenerator()
);
