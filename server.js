const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const app = express();

// Inizializzazione Supabase con le tue credenziali
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Creazione Checkout con tracciamento Partner (Referral)
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
                partner_id: partnerId || 'DIRECT', // Salva l'ID del B&B nei metadati di Stripe
                cart_json: JSON.stringify(cart) 
            },
            mode: 'payment',
            success_url: `https://${req.headers.host}/success.html`,
            cancel_url: `https://${req.headers.host}/index.html`,
        });
        
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// WEBHOOK: Salvataggio nel Database reale dopo il pagamento
app.post('/api/webhook', async (req, res) => {
    const event = req.body;
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const cart = JSON.parse(session.metadata.cart_json);
        const partnerId = session.metadata.partner_id;

        for (const item of cart) {
            // Inserimento nella tabella 'bookings' di Supabase
            const { data, error } = await supabase
                .from('bookings')
                .insert([{
                    customer_email: session.customer_email,
                    service_name: item.name,
                    booking_date: item.date,
                    booking_time: item.time,
                    total_amount: item.price,
                    structure_id: partnerId !== 'DIRECT' ? partnerId : null,
                    status: 'paid'
                }]);
            
            if (!error) {
                // Genera e invia voucher (logica già esistente)
                // await generateAndSendVoucher(session.customer_email, booking);
            }
        }
    }
    res.json({ received: true });
});

module.exports = app;
