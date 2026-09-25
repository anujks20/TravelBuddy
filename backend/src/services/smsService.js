async function sendSms({
  to,
  message,
  sosReference
}) {
  if (!to || !message) {
    return {
      success: false,
      status: "FAILED",
      reason: "Recipient phone number and message are required."
    };
  }

  console.log("");
  console.log("========================================");
  console.log("        TRAVELBUDDY MOCK SMS");
  console.log("========================================");
  console.log(`To: ${to}`);
  console.log(`SOS Reference: ${sosReference}`);
  console.log("Message:");
  console.log(message);
  console.log("========================================");
  console.log("");

  return {
    success: true,
    status: "MOCK_SENT",
    provider: "MOCK_SMS",
    recipient: to,
    sosReference
  };
}

module.exports = {
  sendSms
};