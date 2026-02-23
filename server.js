const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());

// Serve i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- ROTTE DELLE DASHBOARD ---

// Super Admin: Controllo totale
app.get('/master-admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// Partner: Dashboard per i B&B (es: /partner?id=BB_DUOMO)
app.get('/partner-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/partner.html'));
});

// Provider: Dashboard per i Fornitori (es: /provider?id=BOAT_01)
app.get('/provider-panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/provider.html'));
});

// --- SISTEMA DI PAGAMENTO STRIPE ---

app.post('/create-checkout-session', async (req, res) => {
    try {
        const { partnerId } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { 
                        name: 'Notte del Mito - ME-Xperience',
                        description: 'Tour esclusivo nello Stretto di Messina'
                    },
                    unit_amount: 12000, // €120.00
                },
                quantity: 1,
            }],
            metadata: { partner_ref: partnerId || 'DIRECT' },
            mode: 'payment',
            success_url: 'https://me-xperience.com/success',
            cancel_url: 'https://me-xperience.com/cancel',
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Avvio Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ME-Xperience Engine running on port ${PORT}`));
