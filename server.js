const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Cartella per i file statici

// Database simulato (Poi lo collegheremo a Railway/PostgreSQL)
const db = {
    bookings: [],
    partners: [
        { id: 'BB_DUOMO', name: 'B&B Duomo', commissions: 0 },
        { id: 'SEA_MASTER', name: 'Capitan Ciccio', role: 'provider' }
    ]
};

// ROTTE DASHBOARD
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider/:id', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

// API PER DATI DASHBOARD
app.get('/api/stats', (req, res) => {
    res.json({
        totalRevenue: db.bookings.reduce((sum, b) => sum + b.amount, 0),
        bookingCount: db.bookings.length,
        recentBookings: db.bookings.slice(-5)
    });
});

app.listen(process.env.PORT || 3000);
