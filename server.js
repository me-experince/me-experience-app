const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE INTEGRATO IN MEMORIA ---
let data = {
    partners: [
        { id: 'P_DUOMO', name: 'B&B Duomo Messina', type: 'bnb', commission: 15, sales: 2450 },
        { id: 'P_VILLA', name: "Villa Sant'Andrea", type: 'hotel', commission: 20, sales: 3100 }
    ],
    services: [
        { id: 'S_MITO', name: 'Notte del Mito', type: 'exp', price: 120, status: 'attivo' },
        { id: 'S_TRANS', name: 'Transfer Catania CTA', type: 'serv', price: 150, status: 'attivo' }
    ],
    bookings: [
        { id: 'B1', partnerId: 'P_DUOMO', guestName: 'John Smith', date: '2026-03-24', time: '20:30', status: 'confermato' }
    ]
};

// --- API: RECUPERO DATI ---
app.get('/api/admin/data', (req, res) => res.json(data));

// --- API: AGGIUNGI PARTNER ---
app.post('/api/partners/add', (req, res) => {
    const { name, type, commission } = req.body;
    const newPartner = { id: 'P' + Date.now(), name, type, commission: parseInt(commission), sales: 0 };
    data.partners.push(newPartner);
    res.json({ success: true, partner: newPartner });
});

// --- API: AGGIUNGI SERVIZIO ---
app.post('/api/services/add', (req, res) => {
    const { name, type, price } = req.body;
    const newService = { id: 'S' + Date.now(), name, type, price: parseInt(price), status: 'attivo' };
    data.services.push(newService);
    res.json({ success: true, service: newService });
});

// --- API: PRENOTAZIONE MANUALE ---
app.post('/api/bookings/add', (req, res) => {
    const { partnerId, date, time, guestName } = req.body;
    const newBooking = { id: 'B' + Date.now(), partnerId, date, time, guestName, status: 'confermato' };
    data.bookings.push(newBooking);
    const partner = data.partners.find(p => p.id === partnerId);
    if(partner) partner.sales += 120; // Prezzo simulato
    res.json({ success: true, booking: newBooking });
});

// --- STRIPE CHECKOUT ---
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { partnerId, date, time } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: { currency: 'eur', product_data: { name: 'ME-Xperience Legend' }, unit_amount: 12000 },
                quantity: 1,
            }],
            metadata: { partnerId, date, time },
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html`,
            cancel_url: `${req.headers.origin}/cancel.html`,
        });
        res.json({ id: session.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ROUTING ---
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ME-X Engine 2.5 Operational`));
