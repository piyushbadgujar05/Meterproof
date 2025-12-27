const nodemailer = require('nodemailer');

// Create Gmail transporter
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    
    console.log('📧 Gmail config:', user ? `User: ${user}` : 'GMAIL_USER NOT SET');
    console.log('📧 App password:', pass ? 'Found' : 'GMAIL_APP_PASSWORD NOT SET');
    
    if (user && pass) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass
            }
        });
        console.log('✅ Gmail transporter initialized');
    }
    return transporter;
}

/**
 * Send email via Gmail SMTP (works with any email!)
 */
async function sendEmail({ to, subject, html }) {
    const transport = getTransporter();
    
    if (!transport) {
        console.warn('📧 Email skipped (Gmail not configured):', subject, 'to:', to);
        return null;
    }

    try {
        console.log('📧 Sending email to:', to);
        
        const result = await transport.sendMail({
            from: `"MeterProof" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log('✅ Email sent successfully! MessageId:', result.messageId, 'to:', to);
        return result;
    } catch (err) {
        console.error('❌ Email error:', err.message);
        return null;
    }
}

/**
 * Send email verification link
 */
async function sendVerificationEmail(user, token) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${frontendUrl}/verify-email/${token}`;
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to MeterProof!</h2>
            <p>Hi ${user.name},</p>
            <p>Please verify your email address to complete your registration.</p>
            <a href="${verifyUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Verify Email
            </a>
            <p style="color: #666; font-size: 14px;">
                This link expires in 24 hours.<br>
                If you didn't create an account, please ignore this email.
            </p>
        </div>
    `;

    return sendEmail({
        to: user.email,
        subject: 'Verify your email - MeterProof',
        html
    });
}

/**
 * Send payment confirmation email to tenant
 */
async function sendPaymentConfirmationToTenant({ tenant, bill, owner }) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Payment Received ✓</h2>
            <p>Hi ${tenant.name},</p>
            <p>We have received your payment of <strong>₹${bill.amount}</strong> 
               for Electricity Bill (${bill.month}).</p>
            <p>Thank you for your timely payment!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">– MeterProof</p>
        </div>
    `;

    if (tenant.email) {
        return sendEmail({
            to: tenant.email,
            subject: 'Payment Received – MeterProof',
            html
        });
    }
    return null;
}

/**
 * Send payment confirmation email to owner
 */
async function sendPaymentConfirmationToOwner({ tenant, bill, owner }) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Payment Confirmed ✓</h2>
            <p>Payment has been received from your tenant.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Tenant:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${tenant.name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Amount:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">₹${bill.amount}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Month:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${bill.month}</td></tr>
            </table>
            <p style="color: #666; font-size: 12px;">– MeterProof</p>
        </div>
    `;

    return sendEmail({
        to: owner.email,
        subject: 'Payment Confirmed – MeterProof',
        html
    });
}

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPaymentConfirmationToTenant,
    sendPaymentConfirmationToOwner
};
