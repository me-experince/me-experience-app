const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE IN MEMORIA (Persistente fino al riavvio) ---
let data = {
    partners: [
        { id: 'BB_DUOMO', name: 'B&B Duomo Messina', type: 'bnb', commission: 15, sales: 2450 },
        { id: 'VILLA_SA', name: "Villa Sant'Andrea", type: 'hotel', commission: 20, sales: 3100 }
    ],
    services: [
        { id: 'MITO_NOTTE', name: 'Notte del Mito', type: 'exp', price: 120, status: 'attivo' },
        { id: 'TRANS_CTA', name: 'Transfer Catania CTA', type: 'serv', price: 150, status: 'attivo' }
    ],
    bookings: []
};

// --- ROTTE API PER DASHBOARD ADMIN ---

// Ottieni tutti i dati
app.get('/api/admin/data', (req, res) => {
    res.json(data);
});

// Aggiungi un nuovo Partner
app.post('/api/partners/add', (req, res) => {
    const newPartner = {
        id: 'P' + Date.now(),
        ...req.body,
        sales: 0
    };
    data.partners.push(newPartner);
    res.json({ success: true, partner: newPartner });
});

// Aggiungi un nuovo Servizio
app.post('/api/services/add', (req, res) => {
    const newService = {
        id: 'S' + Date.now(),
        ...req.body,
        status: 'attivo'
    };
    data.services.push(newService);
    res.json({ success: true, service: newService });
});

// --- ROTTE PAGINE ---
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ME-X Engine 2.0 Operational on port ${PORT}`));
