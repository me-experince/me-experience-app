const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { 
    extensions: ['html'],
    index: 'index.html' 
}));

// --- DATABASE INTEGRATO (Struttura Intermediazione Luxury) ---
let data = {
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
            type: 'exp', 
            price: 120, 
            mexMargin: 20, // Commissione ME-X
            providerId: 'PROV_CICCIO',
            cancellationPolicy: 'standard' // 48h full, 24h 50%, <24h 0%
        }
    ],
    bookings: []
};

// --- LOGICA EMAIL AUTOMATICHE (MOCKUP) ---
const sendAutomationEmails = (booking, service, partner, provider) => {
    const ivaOnCommission = (booking.mexCut * 0.22).toFixed(2);
    
    console.log(`
    [EMAIL AUTOMATION TRIGGERED]
    --------------------------------------------------
    1. TO GUEST (${booking.guestEmail}): Voucher confermato per ${service.name}.
    2. TO PARTNER (${partner.name}): Nuova provvigione di €${booking.partnerCut.toFixed(2)} registrata.
    3. TO PROVIDER (${provider.name}): Ordine di servizio confermato. Netto a tuo favore: €${booking.providerNet.toFixed(2)}.
    --------------------------------------------------
    `);
};

// --- API: RECUPERO DATI ADMIN ---
app.get('/api/admin/data', (req, res) => res.json(data));

// --- API: CREAZIONE PRENOTAZIONE CON SPLIT FINANZIARIO ---
app.post('/api/bookings/add', (req, res) => {
    const { partnerId, serviceId, guestName, guestEmail, date, time } = req.body;
    
    const service = data.services.find(s => s.id === serviceId);
    const partner = data.partners.find(p => p.id === partnerId);
    const provider = data.providers.find(p => p.id === service.providerId);

    if (!service || !partner) return res.status(404).json({ error: "Dati non trovati" });

    // CALCOLO FINANZIARIO EXECUTIVE
    const total = service.price;
    const partnerCut = (total * partner.commission) / 100;
    const mexCut = (total * service.mexMargin) / 100;
    const providerNet = total - partnerCut - mexCut;
    const ivaOnMex = mexCut * 0.22; // IVA 22% sulla commissione ME-X

    const newBooking = {
        id: 'B' + Date.now(),
        partnerId,
        serviceId,
        guestName,
        guestEmail,
        date,
        time,
        total,
        partnerCut,
        mexCut,
        ivaOnMex,
        providerNet,
        createdAt: new Date(),
        status: 'confermato'
    };

    data.bookings.push(newBooking);
    
    // Aggiorna bilanci interni
    partner.sales += partnerCut;
    provider.balance += providerNet;

    // Trigger Email
    sendAutomationEmails(newBooking, service, partner, provider);

    res.json({ success: true, bookingId: newBooking.id });
});

// --- API: GESTIONE CANCELLAZIONI & PENALI ---
app.post('/api/bookings/cancel', (req, res) => {
    const { bookingId } = req.body;
    const booking = data.bookings.find(b => b.id === bookingId);
    if (!booking) return res.status(404).json({ error: "Prenotazione non trovata" });

    const eventTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    const hoursRemaining = (eventTime - now) / (1000 * 60 * 60);

    let refundAmount = 0;
    let penalty = 0;

    if (hoursRemaining >= 48) {
        refundAmount = booking.total;
        penalty = 0;
    } else if (hoursRemaining >= 24) {
        refundAmount = booking.total * 0.5;
        penalty = booking.total * 0.5;
    } else {
        refundAmount = 0;
        penalty = booking.total;
    }

    booking.status = 'cancellato';
    booking.refundedAmount = refundAmount;

    res.json({ 
        success: true, 
        message: `Cancellazione processata. Ore rimanenti: ${Math.floor(hoursRemaining)}`,
        refund: refundAmount,
        penalty: penalty 
    });
});

// --- STRIPE CHECKOUT ---
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { partnerId, serviceId, date, time } = req.body;
        const service = data.services.find(s => s.id === serviceId);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: service.name + ' | ME-Xperience' },
                    unit_amount: service.price * 100,
                },
                quantity: 1,
            }],
            metadata: { partnerId, serviceId, date, time },
            mode: 'payment',
            success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/cancel`,
        });
        res.json({ id: session.id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SPA FALLBACK ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
    =============================================
    ME-XPERIENCE MASTER ENGINE v3.0
    Status: Operational (Sicily Time)
    Features: IVA 22%, Automated Split, Penalties
    =============================================
    `);
});
