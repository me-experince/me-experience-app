const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Simulato (Da collegare poi a database reale)
let partners = [];

// API per Registrazione Partner/Fornitori
app.post('/api/register-partner', (req, res) => {
    const newPartner = {
        id: 'PT-' + Date.now(),
        ...req.body,
        status: 'Pending Verification'
    };
    partners.push(newPartner);
    res.json({ success: true, partnerId: newPartner.id });
});

// Routing Dashboard
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-registration', (req, res) => res.sendFile(path.join(__dirname, 'public/register.html')));

module.exports = app;
const PORT = process.env.PORT || 3000;
app.listen(PORT);
