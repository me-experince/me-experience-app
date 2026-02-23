const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

// 1. SERVIZIO FILE STATICI
// Questo comando dice al server di cercare immagini, CSS e JS nella cartella public
app.use(express.static(path.join(__dirname, 'public')));

// 2. LOGICA DATABASE TEMPORANEO (In attesa di Database reale)
// Serve per far funzionare i contatori della tua Dashboard Admin
let mockStats = {
    totalRevenue: 1250,
    bookingCount: 12,
    partnersCount: 1
};

// 3. API: STATISTICHE DASHBOARD ADMIN
// Necessario per alimentare i grafici e i numeri della tua dashboard
app.get('/api/stats', (req, res) => {
    res.json(mockStats);
});

// 4. API: REGISTRAZIONE PARTNER & IBAN
// Riceve i dati dal form di registrazione e li processa
app.post('/api/register-partner', (req, res) => {
    const partnerData = req.body;
    console.log("Registrazione Ricevuta:", partnerData);
    
    // Incrementiamo il counter dei partner per la dashboard
    mockStats.partnersCount++;
    
    res.json({ 
        success: true, 
        message: "Contratto digitalizzato ricevuto. Verifica in corso." 
    });
});

// 5. API: STRIPE CHECKOUT
// Gestisce il pagamento e associa il Partner ID (referral) alla transazione
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { partnerId, date, time } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { 
                        name: 'Notte del Mito - ME-Xperience',
                        description: `Tour dello Stretto - Data: ${date} Ore: ${time}` 
                    },
                    unit_amount: 12000, // Prezzo in centesimi (€120.00)
                },
                quantity: 1,
            }],
            metadata: { 
                partner_id: partnerId || 'DIRECT',
                booking_date: date,
                booking_time: time
            },
            mode: 'payment',
            success_url: `https://${req.headers.host}/index.html?status=success`,
            cancel_url: `https://${req.headers.host}/index.html?status=cancel`,
        });
        
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. GESTIONE ROTTE FISICHE (REWRITES LATO SERVER)
// Assicura che ogni pagina HTML venga servita correttamente se richiamata direttamente
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));
app.get('/partner-registration', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

// 7. ESPORTAZIONE PER VERCEL
module.exports = app;

// Avvio locale per test
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Engine ME-X attivo su porta ${PORT}`));
}
