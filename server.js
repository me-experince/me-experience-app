const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DATABASE MOCK (Per gestione dinamica)
let globalBookings = [];
let providersCatalog = [];

// --- LOGICA VOUCHER PDF & EMAIL ---
async function generateAndSendVoucher(customerEmail, bookingData) {
    const qrCodeData = await QRCode.toDataURL(`ID:${bookingData.id}-${bookingData.service}`);
    const doc = new PDFDocument({ margin: 50 });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
        let pdfData = Buffer.concat(buffers);
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: '"ME-X Luxury" <noreply@me-xperience.com>',
            to: customerEmail,
            subject: `Il Tuo Voucher: ${bookingData.service}`,
            text: "Grazie per aver scelto l'esclusività ME-X. In allegato il tuo voucher ufficiale.",
            attachments: [{ filename: `Voucher_MEX_${bookingData.id}.pdf`, content: pdfData }]
        });
    });

    // Design PDF Luxury
    doc.rect(0, 0, 612, 100).fill('#000000');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(25).text('ME-XPERIENCE', 50, 40);
    doc.fillColor('#1a1a1a').moveDown(5);
    doc.fontSize(10).text('OFFICIAL LUXURY VOUCHER', { characterSpacing: 2 });
    doc.moveDown(2);
    doc.fontSize(14).text(`Ospite: ${bookingData.customer}`);
    doc.text(`Servizio: ${bookingData.service}`);
    doc.text(`Data: ${bookingData.date} | Ore: ${bookingData.time}`);
    doc.moveDown(2);
    doc.image(qrCodeData, { fit: [140, 140], align: 'center' });
    doc.moveDown(2);
    doc.fontSize(8).text('Presenta questo codice al fornitore per il check-in.', { align: 'center', italic: true });
    doc.end();
}

// --- API ROUTES ---

// 1. Aggiunta Prodotto dal Catalogo Admin
app.post('/api/admin/add-provider', (req, res) => {
    const product = req.body;
    product.id = Date.now();
    providersCatalog.push(product);
    res.json({ success: true });
});

// 2. Recupero Calendario Master
app.get('/api/calendar/events', (req, res) => res.json(globalBookings));

// 3. Checkout Stripe (Carrello)
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
            metadata: { partner_id: partnerId || 'DIRECT', cart_json: JSON.stringify(cart) },
            mode: 'payment',
            success_url: `https://${req.headers.host}/success.html`,
            cancel_url: `https://${req.headers.host}/index.html`,
        });
        res.json({ id: session.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. Webhook Stripe (Innesca Mail al pagamento)
app.post('/api/webhook', async (req, res) => {
    // Nota: in produzione verifica la firma Stripe
    const session = req.body.data.object;
    if (req.body.type === 'checkout.session.completed') {
        const cart = JSON.parse(session.metadata.cart_json);
        cart.forEach(item => {
            const booking = { id: Math.floor(1000+Math.random()*9000), customer: session.customer_details.name, service: item.name, date: item.date, time: item.time };
            globalBookings.push(booking);
            generateAndSendVoucher(session.customer_email, booking);
        });
    }
    res.json({ received: true });
});

app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('Engine ME-X Ready.'));
}
