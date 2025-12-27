const twilio = require('twilio');

let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (accountSid && accountSid.startsWith('AC') && authToken) {
  try {
    client = new twilio(accountSid, authToken);
  } catch (err) {
    console.warn('Twilio Initialization Failed:', err.message);
  }
} else {
  console.warn('Twilio credentials missing or invalid. SMS will be skipped.');
}

const templates = {
  en: (month, amount, link) =>
    `MeterProof: Your electricity bill for ${month} is generated.\nAmount: ₹${amount}\nView bill: ${link}`,
  mr: (month, amount, link) =>
    `MeterProof: तुमचे ${month} चे वीज बिल तयार झाले आहे.\nरक्कम: ₹${amount}\nबिल पाहा: ${link}`
};

const sendBillSMS = async (tenant, bill, billLink) => {
  try {
    if (!client) {
      console.warn('SMS Skipped: Twilio client not initialized.');
      return;
    }
    if (!tenant.mobile) {
      console.warn('SMS Skipped: Tenant has no mobile number.');
      return;
    }

    const defaultCountry = process.env.TWILIO_DEFAULT_COUNTRY || '+91';
    let toNumber = tenant.mobile.trim();
    if (!toNumber.startsWith('+')) {
      toNumber = `${defaultCountry}${toNumber}`;
    }

    const verifiedEnv = (process.env.TWILIO_VERIFIED_RECIPIENTS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (verifiedEnv.length && !verifiedEnv.includes(toNumber)) {
      console.warn(`SMS Skipped: ${toNumber} is not in TWILIO_VERIFIED_RECIPIENTS`);
      return;
    }

    const lang = tenant.language && templates[tenant.language] ? tenant.language : 'en';
    const body = templates[lang](bill.month, bill.amount, billLink);

    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toNumber
    });

    console.log(`SMS Sent Successfully! SID: ${message.sid}, To: ${toNumber}`);
    return message;
  } catch (error) {
    console.error('SMS Failed:', error.message);
  }
};

module.exports = sendBillSMS;

