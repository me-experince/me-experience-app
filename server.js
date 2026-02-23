const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE IN MEMORIA (Il "Cervello" di ME-X) ---
// Qui i dati vengono salvati dinamicamente durante la sessione
let data = {
    partners: [
        { id: 'P_DUOMO', name: 'B&B Duomo Messina', type: 'bnb', commission: 15, sales: 2450 },
        { id: 'P_VILLA', name: "Villa Sant'Andrea", type: 'hotel', commission: 20, sales: 3100 }
    ],
    services: [
        { id: 'S_MITO', name: 'Notte del Mito', type: 'exp', price: 120, status: 'attivo' },
        { id: 'S_TRANS', name: 'Transfer Catania CTA', type: 'serv', price: 150, status: 'attivo' }
    ],
    bookings: []
};

// --- ROTTE API (COMUNICAZIONE DASHBOARD) ---

// 1. Recupera tutto il database (per popolare le tabelle dell'admin)
app.get('/api/admin/data', (req, res) => {
    res.json(data);
});

// 2. Aggiungi Partner (Chiamata dal modale Admin)
app.post('/api/partners/add', (req, res) => {
    const { name, type, commission } = req.body;
    const newPartner = {
        id: 'P' + Math.floor(Math.random() * 10000), // Genera ID univoco
        name,
        type,
        commission,
        sales: 0
    };
    data.partners.push(newPartner);
    res.json({ success: true, partner: newPartner });
});

// 3. Aggiungi Servizio/Esperienza
app.post('/api/services/add', (req, res) => {
    const { name, type, price } = req.body;
    const newService = {
        id: 'S' + Math.floor(Math.random() * 10000),
        name,
        type,
        price,
        status: 'attivo'
    };
    data.services.push(newService);
    res.json({ success: true, service: newService });
});

// --- SISTEMA DI PAGAMENTO STRIPE ---
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { partnerId, date, time } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Notte del Mito - ME-Xperience' },
                    unit_amount: 12000,
                },
                quantity: 1,
            }],
            metadata: { partner_id: partnerId, date: date, time: time },
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html`,
            cancel_url: `${req.headers.origin}/cancel.html`,
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- GESTIONE PAGINE (ROUTING) ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/services.html')));
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

// --- AVVIO SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    ME-XPERIENCE ENGINE OPERATIVO (Versione 2.5)
    Stato Sicurezza: Attivo
    Database: In Memoria
    Porta: ${PORT}
    -------------------------------------------
    `);
});
