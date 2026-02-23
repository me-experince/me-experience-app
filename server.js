const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DATABASE MOCK (In futuro questo sarà il tuo Database reale)
let globalBookings = [
    { id: 1, date: '2026-02-25', time: '20:30', service: 'Notte del Mito', provider: 'Feluca_01', customer: 'Mario Rossi' }
];

// 1. API: RECUPERO CALENDARIO MASTER (Per Admin, Partner e Provider)
app.get('/api/calendar/events', (req, res) => {
    // L'Admin vede tutto, il Provider vedrebbe solo i suoi (logica da espandere)
    res.json(globalBookings);
});

// 2. API: CREAZIONE CHECKOUT MULTIPLO (CARRELLO)
app.post('/api/create-luxury-checkout', async (req, res) => {
    try {
        const { cart, customerEmail, partnerId } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            customer_email: customerEmail,
            payment_method_types: ['card', 'paypal'],
            line_items: cart.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: { 
                        name: item.name,
                        description: `Data: ${item.date} - Ore: ${item.time}`
                    },
                    unit_amount: item.price * 100,
                },
                quantity: 1,
            })),
            metadata: { 
                partner_id: partnerId || 'DIRECT',
                cart_details: JSON.stringify(cart.map(i => i.id))
            },
            mode: 'payment',
            success_url: `https://${req.headers.host}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://${req.headers.host}/cart.html`,
        });
        
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. API: REGISTRAZIONE UTENTE/CLIENTE (SICUREZZA)
app.post('/api/auth/register-customer', (req, res) => {
    const { email, name } = req.body;
    console.log(`Nuovo Cliente Registrato: ${email}`);
    res.json({ success: true, message: "Account ME-X creato." });
});

// 4. ROTTE FISICHE PER VERCEL
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log('ME-X Luxury Engine Running...'));
}
