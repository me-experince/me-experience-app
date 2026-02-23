const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve i file dalla cartella public
app.use(express.static(path.join(__dirname, 'public')));

// Rotta per la home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Esporta per Vercel
module.exports = app;
