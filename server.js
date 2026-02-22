const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
    const { partnerId } = req.body;
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
        metadata: { partner_id: partnerId },
        mode: 'payment',
        success_url: 'https://me-xperience.com/success',
        cancel_url: 'https://me-xperience.com/cancel',
    });
    res.json({ id: session.id });
});

app.listen(process.env.PORT || 3000, () => console.log('Server running'));
