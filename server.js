const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());

// --- DATABASE INTEGRATO ---
let data = {
    partners: [{ id: 'P_DUOMO', name: 'B&B Duomo Messina', type: 'bnb', commission: 10, sales: 0 }],
    providers: [{ id: 'PROV_CICCIO', name: 'Capitan Ciccio', email: 'fornitore@example.com', balance: 0 }],
    services: [{ id: 'S_MITO', name: 'Notte del Mito', price: 120, mexMargin: 20, providerId: 'PROV_CICCIO' }],
    bookings: []
};

// --- API PER LA DASHBOARD (DEVONO STARE SOPRA LE ROTTE HTML) ---
app.get('/api/admin/data', (req, res) => res.json(data));

// --- ROTTE ESPLICITE PER LE PAGINE ---
// Usiamo sendFile per essere sicuri che il server trovi i file
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/services.html')));
app.get('/partner', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));

// --- SERVIZIO FILE STATICI (CSS, Immagini, etc.) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- LOGICA DI CALCOLO FINANZIARIO ---
app.post('/api/bookings/add', (req, res) => {
    const { partnerId, serviceId, guestName, date, time } = req.body;
    const service = data.services.find(s => s.id === serviceId);
    const partner = data.partners.find(p => p.id === partnerId);

    const total = service.price;
    const partnerCut = (total * partner.commission) / 100;
    const mexCut = (total * service.mexMargin) / 100;
    const ivaOnMex = mexCut * 0.22; // IVA 22% sulla commissione ME-X
    const providerNet = total - partnerCut - mexCut;

    const newBooking = {
        id: 'B' + Date.now(),
        guestName, date, time, total,
        partnerCut, mexCut, ivaOnMex, providerNet,
        status: 'confermato'
    };

    data.bookings.push(newBooking);
    partner.sales += partnerCut;
    res.json({ success: true, booking: newBooking });
});

// --- FALLBACK HOME ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ME-X Engine v3.1 Operational`));
