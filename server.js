const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rotte principali
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/master-admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/partner-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/partner.html')));
app.get('/provider-panel', (req, res) => res.sendFile(path.join(__dirname, 'public/provider.html')));

// Export per Vercel
module.exports = app; 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
