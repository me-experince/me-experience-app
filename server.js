const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Temporaneo
let globalBookings = [];
let providersCatalog = [];

// --- LOGICA GENERAZIONE E INVIO VOUCHER ---
async function generateAndSendVoucher(customerEmail, bookingData) {
    try {
        const qrCodeData = await QRCode.toDataURL(`ID:${bookingData.id}-${bookingData.service}`);
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            
            // Configurazione Trasportatore Mail
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { 
                    user: process.env.EMAIL_USER, 
                    pass: process.env.EMAIL_PASS 
                }
            });

            await transporter.sendMail({
                from: '"ME-X Luxury" <noreply@me-xperience.com>',
                to: customerEmail,
                subject: `Il Tuo Voucher Ufficiale: ${bookingData.service}`,
                text: `Gentile ${bookingData.customer}, grazie per aver scelto ME-X. Trovi in allegato il voucher per la tua esperienza.`,
                attachments: [{ filename: `Voucher_MEX_${bookingData.id}.pdf`, content: pdfData }]
            });
            console.log(`Voucher inviato a: ${customerEmail}`);
        });

        // --- DESIGN VOUCHER LUXURY ---
        doc.rect(0, 0, 612, 120).fill('#000000');
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26).text('ME-XPERIENCE', 50, 45);
        doc.fillColor('#1a1a1a').moveDown(6);
        doc.fontSize(10).text('OFFICIAL LUXURY VOUCHER', { characterSpacing: 2, align: 'center' });
        doc.moveDown(3);
        doc.fontSize(14).text(`OSPITE: ${bookingData.customer.toUpperCase()}`);
        doc.text(`SERVIZIO: ${bookingData.service.toUpperCase()}`);
        doc.text(`DATA: ${bookingData.date} | ORE: ${bookingData.time}`);
        doc.moveDown(2);
        doc.image(qrCodeData, { fit: [150, 150], align: 'center' });
        doc.moveDown(2);
        doc.fontSize(9).text('Presenta il codice al fornitore per l\'imbarco o l\'inizio del servizio.', { align: 'center', italic: true });
        doc.end();
    } catch (err) {
        console.error("Errore generazione voucher:", err);
    }
}

// --- API ENDPOINTS ---

app.post('/api/admin/add-provider', (req, res) => {
    const product = req.body;
    product.id = Date.now();
    providersCatalog.push(product);
    res.json({ success: true });
});

app.get('/api/calendar/events', (req, res) => res.json(globalBookings));

app.post('/api/create-luxury-checkout', async (req, res) => {
    try {
        const { cart, customerEmail, partnerId } = req.body;
        const session = await stripe.checkout.sessions.create({
            customer_email: customerEmail,
            payment_method_types: ['card', 'paypal'],
            line_items: cart.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: { name: item.name },
                    unit_amount: item.price * 100,
                },
                quantity: 1,
            })),
            metadata: { 
                partner_id: partnerId || 'DIRECT', 
                cart_json: JSON.stringify(cart) 
            },
            mode: 'payment',
            success_url: `https://${req.headers.host}/success.html`,
            cancel_url: `https://${req.headers.host}/index.html`,
        });
        res.json({ id: session.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Webhook Stripe: Trigger al completamento del pagamento
app.post('/api/webhook', async (req, res) => {
    const event = req.body;
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const cart = JSON.parse(session.metadata.cart_json);
        
        for (const item of cart) {
            const booking = { 
                id: Math.floor(10000 + Math.random() * 90000), 
                customer: session.customer_details.name, 
                service: item.name, 
                date: item.date, 
                time: item.time 
            };
            globalBookings.push(booking);
            await generateAndSendVoucher(session.customer_email, booking);
        }
    }
    res.json({ received: true });
});

// Redirect per rotte pulite
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('ME-X Luxury Engine Ready on port 3000'));
}
