module.exports = ({ bill, owner, tenant }) => {
    const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Safe defaults for owner and tenant
    const safeOwner = owner || { name: 'House Owner', mobile: 'N/A' };
    const safeTenant = tenant || { name: 'Tenant', mobile: 'N/A' };
    
    // CSS for PDF
    const styles = `
        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .brand h1 { margin: 0; color: #2563eb; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .brand p { margin: 5px 0 0; color: #666; font-size: 12px; }
        .invoice-details { text-align: right; }
        .invoice-details h2 { margin: 0; font-size: 32px; color: #1f2937; }
        .invoice-details p { margin: 5px 0 0; color: #6b7280; font-family: monospace; }
        
        .grid { display: flex; gap: 40px; margin-bottom: 40px; }
        .col { flex: 1; }
        .label { font-size: 10px; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
        .value-lg { font-size: 18px; font-weight: bold; color: #111; }
        .value-sm { font-size: 14px; color: #4b5563; }
        .value-mono { font-family: monospace; color: #4b5563; }

        .consumption-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .consumption-table th { text-align: left; padding: 12px; background: #f3f4f6; color: #4b5563; font-size: 11px; text-transform: uppercase; }
        .consumption-table td { padding: 15px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: bold; }
        .total-row td { background: #1f2937; color: white; font-size: 18px; padding: 20px; }

        .proof-section { margin-top: 20px; }
        .proof-header { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
        
        .image-container { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; background: #f9fafb; }
        .image-title { font-weight: bold; margin-bottom: 10px; color: #1f2937; display: flex; justify-content: space-between; }
        .meter-img { width: 100%; max-height: 500px; object-fit: contain; display: block; margin: 0 auto; }
        
        .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        
        .status-paid { color: #16a34a; border: 1px solid #16a34a; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; display: inline-block; }
        .status-unpaid { color: #dc2626; border: 1px solid #dc2626; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; display: inline-block; }
    `;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>${styles}</style>
    </head>
    <body>
        <div class="header">
            <div class="brand">
                <h1>MeterProof</h1>
                <p>ELECTRICITY BILLING STATEMENT</p>
            </div>
            <div class="invoice-details">
                <h2>INVOICE</h2>
                <p>#MP-${bill.month.replace('-', '')}-${String(bill._id).slice(-4).toUpperCase()}</p>
                <div style="margin-top: 10px;">
                    <span class="${bill.status === 'PAID' ? 'status-paid' : 'status-unpaid'}">
                        ${bill.status}
                    </span>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="col">
                <div class="label">FROM (OWNER)</div>
                <div class="value-lg">${safeOwner.name || 'House Owner'}</div>
                <div class="value-sm">Landlord / Building Owner</div>
                <div class="value-mono">Mo: ${safeOwner.mobile || 'N/A'}</div>
            </div>
            <div class="col" style="text-align: right;">
                <div class="label">TO (TENANT)</div>
                <div class="value-lg">${safeTenant.name || 'Tenant'}</div>
                <div class="value-sm">Rental Unit</div>
                <div class="value-mono">Mo: ${safeTenant.mobile || 'N/A'}</div>
            </div>
        </div>

        <table class="consumption-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Previous Reading</th>
                    <th>Current Reading</th>
                    <th>Rate / Unit</th>
                    <th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Electricity Charges (${bill.month})</td>
                    <td style="font-family: monospace;">${bill.previousReading}</td>
                    <td style="font-family: monospace; color: #2563eb;">${bill.currentReading}</td>
                    <td>₹${bill.unitRate}</td>
                    <td style="text-align: right;">₹${bill.amount}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="4">TOTAL PAYABLE AMOUNT</td>
                    <td style="text-align: right;">₹${bill.amount}</td>
                </tr>
            </tbody>
        </table>

        <div class="proof-section">
            <div class="proof-header">Meter Reading Proofs</div>

            <!-- Previous Month Image -->
            <div class="image-container">
                <div class="image-title">
                    <span>Previous Month Reading</span>
                    <span style="font-family: monospace; color: #666;">Reading: ${bill.previousReading}</span>
                </div>
                ${bill.previousPhotoUrl 
                    ? `<img src="${bill.previousPhotoUrl}" class="meter-img" />` 
                    : '<div style="padding: 20px; text-align: center; color: #999;">No Image Available</div>'
                }
            </div>

            <!-- Page break handling happens automatically via CSS usually, but we ensure separate containers -->
            
            <!-- Current Month Image -->
            <div class="image-container">
                <div class="image-title">
                    <span>Current Month Reading</span>
                    <span style="font-family: monospace; color: #2563eb;">Reading: ${bill.currentReading} | Date: ${formatDate(bill.createdAt)}</span>
                </div>
                <img src="${bill.currentPhotoUrl}" class="meter-img" />
            </div>
        </div>

        <div class="footer">
            Generated via MeterProof • ${new Date().toLocaleString()} • Page 1 of 1
        </div>
    </body>
    </html>
    `;
};
