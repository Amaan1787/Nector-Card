class NectorHospitalCardGenerator {
    constructor() {
        this.form = document.getElementById("cardForm");
        this.canvas = document.getElementById("loyaltyCard");
        this.ctx = this.canvas.getContext("2d");
        this.templateImage = new Image();
        this.templateImage.crossOrigin = "anonymous";
        this.downloadBtn = document.getElementById("downloadBtn");
        this.shareBtn = document.getElementById("shareBtn");
        this.messageBox = document.getElementById("messageBox");
        this.downloadBtn.style.display = "none";
        this.shareBtn.style.display = "none";
        this.messageBox.style.display = "none";
        this.preventOverwrite = false;

        this.templateImage.onload = () => {
            if (!this.preventOverwrite) {
                this.drawDefaultCard();
            }
        };
        this.templateImage.onerror = () => this.drawFallbackCard();
        this.templateImage.src = "card.jpg";

        document.getElementById("generateBtn").addEventListener("click", (e) => this.handleFormSubmit(e));
        this.downloadBtn.addEventListener("click", () => this.downloadCard());
        this.shareBtn.addEventListener("click", () => this.shareCard());

        // Add address character counter
        this.setupAddressCounter();
    }

    setupAddressCounter() {
        const addressField = document.getElementById("address");
        const charCount = document.getElementById("charCount");
        
        if (addressField && charCount) {
            addressField.addEventListener("input", () => {
                const remaining = 100 - addressField.value.length;
                charCount.textContent = `${remaining} characters remaining`;
                charCount.style.color = remaining < 20 ? "red" : "#666";
            });
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        const patientId = this.form.patientId.value.trim();
        const patientName = this.form.patientName.value.trim();
        const phoneNumber = this.form.phoneNumber.value.trim();
        const address = this.form.address.value.trim();
        const discount = this.form.discountPercent.value;

        if (!patientId || !patientName || !phoneNumber || !address || !discount) {
            this.showMessage("Please fill all required fields.", true);
            return;
        }

        // Phone number validation
        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(phoneNumber)) {
            this.showMessage("⚠️ Invalid Phone number.", true);
            return;
        }

        // Address validation
        if (address.length > 100) {
            this.showMessage("⚠️ Address too long. Maximum 100 characters allowed.", true);
            return;
        }

        const patientCard = {
            cardNo: "CARD-" + Date.now(),
            patientId,
            patientName,
            phoneNumber,
            address,
            discount,
            validTill: this.generateExpiryDate(),
        };

        this.preventOverwrite = true;
        this.drawCard(patientCard);
        this.downloadBtn.style.display = "inline-block";
        this.shareBtn.style.display = "inline-block";
        this.showMessage("Patient Card ready! Save or download.", false);

        // Send to backend
        try {
            const res = await fetch("http://localhost:3000/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patientCard),
            });
            if (!res.ok) throw new Error("Server error");
            const data = await res.json();
            if (data.message.includes("updated")) {
                this.showMessage("✅ Patient already exists, details updated!", false);
            } else {
                this.showMessage("✅ New patient saved successfully!", false);
            }
        } catch (err) {
            this.showMessage("⚠️ Data not saved to file! " + err.message, true);
        }
    }

    splitAddress(address) {
        if (address.length <= 50) {
            return { line1: address, line2: "" };
        }
        
        // Find best split point (prefer word boundary)
        let splitPoint = address.lastIndexOf(' ', 50);
        if (splitPoint === -1) splitPoint = 50;
        
        return {
            line1: address.substring(0, splitPoint).trim(),
            line2: address.substring(splitPoint).trim()
        };
    }

    drawCard(cardData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.templateImage.complete && this.templateImage.naturalWidth !== 0) {
            this.ctx.drawImage(this.templateImage, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.drawFallbackCard();
        }

        // Updated positioning for new card layout
        this.ctx.font = "18px Arial";
        this.ctx.fillStyle = "#000";
        
        // Patient ID - updated position
        this.ctx.fillText(cardData.patientId, 515, 250);
        
        // Name - updated position  
        this.ctx.fillText(cardData.patientName, 515, 310);
        
        // Phone - updated position
        this.ctx.fillText(cardData.phoneNumber, 515, 370);

        // Address - 2 lines with updated positions
        const addressLines = this.splitAddress(cardData.address);
        this.ctx.fillText(addressLines.line1, 515, 430); // Line 1
        if (addressLines.line2) {
            this.ctx.fillText(addressLines.line2, 515, 455); // Line 2
        }

        // Discount and validity
        this.ctx.font = "bold 16px Arial";
        this.ctx.fillText(`Discount UPTO: ${cardData.discount}%`, 450, 500);
        this.ctx.fillText(`Valid Till: ${cardData.validTill}`, 450, 525);
    }

    drawDefaultCard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.templateImage.complete && this.templateImage.naturalWidth !== 0) {
            this.ctx.drawImage(this.templateImage, 0, 0, this.canvas.width, this.canvas.height);
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

    generateExpiryDate() {
        let today = new Date();
        let nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
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

    async shareCard() {
        try {
            const originalText = this.shareBtn.innerHTML;
            this.shareBtn.innerHTML = "📤 Sharing...";
            this.shareBtn.disabled = true;

            this.canvas.toBlob(async (blob) => {
                try {
                    const file = new File([blob], "nector-hospital-card.png", { type: "image/png" });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: "Patient Card - Nector Hospital",
                            text: "Here is your patient card from Nector Hospital.",
                            files: [file]
                        });
                        this.showMessage("✅ Card shared successfully!", false);
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "nector-hospital-card.png";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        this.showMessage("Card downloaded! (Sharing not supported on this device)", false);
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        this.showMessage("⚠️ Error sharing card. Please try again.", true);
                    }
                } finally {
                    this.shareBtn.innerHTML = originalText;
                    this.shareBtn.disabled = false;
                }
            }, 'image/png', 0.9);
        } catch (error) {
            this.showMessage("⚠️ Error creating card image. Please try again.", true);
            this.shareBtn.innerHTML = originalText;
            this.shareBtn.disabled = false;
        }
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

window.addEventListener("DOMContentLoaded", () => new NectorHospitalCardGenerator());
