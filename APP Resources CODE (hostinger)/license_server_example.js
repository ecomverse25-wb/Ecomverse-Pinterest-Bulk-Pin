
/**
 * LICENSE SERVER EXAMPLE (Node.js)
 * 
 * You need to host this code on a server (like Render, Heroku, Railway, or a VPS).
 * This manages your unique customer keys.
 * 
 * 1. Initialize a new Node project: `npm init -y`
 * 2. Install dependencies: `npm install express cors body-parser`
 * 3. Run: `node license_server_example.js`
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your React app can talk to this server
app.use(cors());
app.use(bodyParser.json());

// --- YOUR CUSTOMER DATABASE ---
// In a real app, use a database (MongoDB, Postgres, Firebase). 
// For now, a simple list works for manual management.
const VALID_KEYS = {
    "EV-CLIENT-001": { active: true, owner: "John Doe" },
    "EV-CLIENT-002": { active: true, owner: "Jane Smith" },
    "EV-VIP-USER":   { active: true, owner: "VIP Customer" },
    "WAL7BXDX":      { active: true, owner: "Owner Access" }, // Added your key
    // Add new keys here manually when you get a new customer
};

// Verification Endpoint
app.post('/verify-license', (req, res) => {
    const { licenseKey } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ valid: false, message: "No key provided" });
    }

    const keyData = VALID_KEYS[licenseKey];

    if (keyData && keyData.active) {
        console.log(`[SUCCESS] Verified key for: ${keyData.owner}`);
        return res.json({ 
            valid: true, 
            owner: keyData.owner 
        });
    } else {
        console.log(`[FAILED] Invalid key attempt: ${licenseKey}`);
        return res.status(401).json({ 
            valid: false, 
            message: "Invalid or inactive license key." 
        });
    }
});

app.listen(PORT, () => {
    console.log(`License Server running on port ${PORT}`);
});
