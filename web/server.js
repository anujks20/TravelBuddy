require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

// Routes
app.use('/api', apiRoutes);
app.use('/webhook', webhookRoutes);

// Fallback to index.html for single page app experience if needed
app.use((req, res) => {
    // Only fallback for GET requests that are non-API and non-webhook routes
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/webhook')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).json({ error: 'Not Found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
