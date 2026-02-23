const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Fondamentale per i pagamenti
const app = express();

app.use(express.json());

// 1. Serve i file statici dalla cartella public
app.use(express.static(path.join(__dirname, 'public')));

// 2. Rotta per la home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. API per il Checkout di Stripe (Rende il tasto "Book" operativo)
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { partnerId } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { 
                        name: 'Notte del Mito - ME-Xperience',
                        description: 'Tour esclusivo nello Stretto' 
                    },
                    unit_amount: 12000, // Prezzo in centesimi (€120)
                },
                quantity: 1,
            }],
            metadata: { partner_id: partnerId || 'DIRECT' }, // Traccia chi ha venduto
            mode: 'payment',
            success_url: 'https://' + req.headers.host + '/success.html',
            cancel_url: 'https://' + req.headers.host + '/cancel.html',
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. API per la Registrazione Partner (Riceve i dati dal modulo e l'IBAN)
app.post('/api/register-partner', (req, res) => {
    const data = req.body;
    console.log("Nuova richiesta partner ricevuta:", data);
    // In futuro qui collegheremo un database (es. Supabase o MongoDB)
    res.json({ success: true, message: "Candidatura ricevuta con successo" });
});

// Esporta per Vercel (Cruciale per non avere errori 500)
module.exports = app;

// Avvio locale (per i tuoi test)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server ME-X in esecuzione su http://localhost:${PORT}`));
}
