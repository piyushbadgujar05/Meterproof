const twilio = require('twilio');

let client = null;

/**
 * Initialize Twilio client (lazy init)
 */
function getTwilioClient() {
  if (client) return client;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  console.log('📱 Twilio config check:');
  console.log('  - TWILIO_ACCOUNT_SID:', accountSid ? `${accountSid.substring(0, 6)}...` : '❌ NOT SET');
  console.log('  - TWILIO_AUTH_TOKEN:', authToken ? '✅ Set' : '❌ NOT SET');
  console.log('  - TWILIO_PHONE_NUMBER:', phoneNumber || '❌ NOT SET');
  
  if (!accountSid || !accountSid.startsWith('AC') || !authToken) {
    console.warn('⚠️ Twilio credentials invalid. SMS will be skipped.');
    return null;
  }
  
  try {
    client = new twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized');
    return client;
  } catch (err) {
    console.error('❌ Twilio Initialization Failed:', err.message);
    return null;
  }
}

const templates = {
  en: (month, amount, link) =>
    `MeterProof: Your electricity bill for ${month} is generated.\nAmount: ₹${amount}\nView bill: ${link}`,
  mr: (month, amount, link) =>
    `MeterProof: तुमचे ${month} चे वीज बिल तयार झाले आहे.\nरक्कम: ₹${amount}\nबिल पाहा: ${link}`
};

const sendBillSMS = async (tenant, bill, billLink) => {
  try {
    const twilioClient = getTwilioClient();
    if (!twilioClient) {
      console.warn('📱 SMS Skipped: Twilio client not initialized.');
      return;
    }
    if (!tenant.mobile) {
      console.warn('📱 SMS Skipped: Tenant has no mobile number.');
      return;
    }

    const defaultCountry = process.env.TWILIO_DEFAULT_COUNTRY || '+91';
    let toNumber = tenant.mobile.trim();
    if (!toNumber.startsWith('+')) {
      toNumber = `${defaultCountry}${toNumber}`;
    }

    console.log('📱 Attempting to send SMS to:', toNumber);

    const lang = tenant.language && templates[tenant.language] ? tenant.language : 'en';
    const body = templates[lang](bill.month, bill.amount, billLink);

    const message = await twilioClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });

    console.log(`📱 SMS Sent Successfully! SID: ${message.sid}, To: ${toNumber}`);
    return message;
  } catch (error) {
    console.error('SMS Failed:', error.message);
  }
};

module.exports = sendBillSMS;

