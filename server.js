const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public')); 

// 1. DATABASE SIMULATO POTENZIATO (Unico e completo)
const db = {
    bookings: [
        { id: 1, partner_id: 'BB_DUOMO', amount: 120, date: '2026-02-20', status: 'completed' },
        { id: 2, partner_id: 'GANZIRRI_SUNSET', amount: 85, date: '2026-02-21', status: 'completed' }
    ],
    partners: [
        { id: 'BB_DUOMO', name: 'B&B Duomo Elegance', commission_rate: 0.15, qr_scans: 150 },
        { id: 'GANZIRRI_SUNSET', name: 'Ganzirri Sunset House', commission_rate: 0.12, qr_scans: 85 }
    ],
    providers: [
        { id: 'SEA_MASTER', name: 'Capitan Ciccio', role: 'provider' }
    ]
};

// 2. ROTTE DASHBOARD CON PROTEZIONE

// Rotta Admin PROTETTA (Accedi con: me-xperience.com/admin?key=MESSINA_PROVINCIA_2026)
app.get('/admin', (req, res) => {
    const accessKey = req.query.key;
    if (accessKey === 'MESSINA_PROVINCIA_2026') { 
        res.sendFile(path.join(__dirname, 'public/admin.html'));
    } else {
        res.status(403).send('<center><h1>⛔ Accesso Negato</h1><p>Chiave di comando errata o mancante.</p></center>');
    }
});

// Rotte Partner e Fornitore (Semplici per ora)
app.get('/partner/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

// 3. API PER I DATI (Servono a far funzionare i grafici)
app.get('/api/stats', (req, res) => {
    res.json({
        totalRevenue: db.bookings.reduce((sum, b) => sum + b.amount, 0),
        bookingCount: db.bookings.length,
        partners: db.partners,
        recentBookings: db.bookings.slice(-5)
    });
});

// 4. AVVIO SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ME-XPERIENCE pronto sulla porta ${PORT}`));
