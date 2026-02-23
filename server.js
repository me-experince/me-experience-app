const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());

// --- 1. DATABASE INTEGRATO (Partner, Servizi, Utenti e Bookings) ---
let data = {
    users: [
        { email: 'admin@me-xperience.com', password: 'Password123!', role: 'admin' }
    ],
    partners: [
        { id: 'P_DUOMO', name: 'B&B Duomo Messina', type: 'bnb', commission: 10, sales: 0 }
    ],
    providers: [
        { id: 'PROV_CICCIO', name: 'Capitan Ciccio', email: 'fornitore@example.com', balance: 0 }
    ],
    services: [
        { 
            id: 'S_MITO', 
            name: 'Notte del Mito', 
            price: 120, 
            mexMargin: 20, 
            providerId: 'PROV_CICCIO',
            type: 'exp' 
        }
    ],
    bookings: []
};

// --- 2. LOGICA DI AUTENTICAZIONE (Login, Register, Forgot) ---

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, role: user.role, token: 'MEX_AUTH_' + Date.now() });
    } else {
        res.status(401).json({ success: false, message: 'Credenziali errate' });
    }
});

app.post('/api/auth/register', (req, res) => {
    const { email, password, role } = req.body;
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'Email già esistente' });
    }
    data.users.push({ email, password, role: role || 'partner' });
    res.json({ success: true, message: 'Registrazione completata' });
});

app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    const user = data.users.find(u => u.email === email);
    if (user) {
        console.log(`[MAIL] Link di recupero inviato a: ${email}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ message: 'Email non trovata' });
    }
});

// --- 3. API CORE (Dati Admin e Operatività) ---

app.get('/api/admin/data', (req, res) => res.json(data));

app.post('/api/bookings/add', (req, res) => {
    const { partnerId, serviceId, guestName, guestEmail, date, time } = req.body;
    
    const service = data.services.find(s => s.id === serviceId);
    const partner = data.partners.find(p => p.id === partnerId);
    const provider = data.providers.find(p => p.id === service.providerId);

    if (!service || !partner) return res.status(404).json({ error: "Dati non trovati" });

    // Calcolo Finanziario con IVA 22% su commissione ME-X
    const total = service.price;
    const partnerCut = (total * partner.commission) / 100;
    const mexCut = (total * service.mexMargin) / 100;
    const ivaOnMex = mexCut * 0.22;
    const providerNet = total - partnerCut - mexCut;

    const newBooking = {
        id: 'B' + Date.now(),
        partnerId, serviceId, guestName, guestEmail, date, time,
        total, partnerCut, mexCut, ivaOnMex, providerNet,
        status: 'confermato'
    };

    data.bookings.push(newBooking);
    partner.sales += partnerCut;
    provider.balance += providerNet;

    // Trigger simulato email (Log in console)
    console.log(`[NOTIFICA] Email inviate a: ${guestEmail}, ${partner.name}, ${provider.name}`);

    res.json({ success: true, booking: newBooking });
});

// --- 4. GESTIONE ROT
