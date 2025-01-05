const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { Storage } = require('megajs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3000;

// In-memory mapping (use a real database in production)
const fileMappings = {};

// MEGA credentials
const MEGA_EMAIL = 'maxwellexcel2@gmail.com';
const MEGA_PASSWORD = 'mynameisexcel2';

// Storage instance
const megaStorage = new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Temporary file storage
const upload = multer({ dest: 'temp/' });

// Serve `index.html` as the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Upload file to MEGA
        const megaFile = megaStorage.upload({ name: fileName });
        fs.createReadStream(filePath).pipe(megaFile);

        // Wait for the upload to complete
        const megaLink = await new Promise((resolve, reject) => {
            megaFile.on('complete', file => resolve(file.link));
            megaFile.on('error', reject);
        });

        // Remove temporary file
        fs.unlinkSync(filePath);

        // Generate a unique custom link
        const customId = uuidv4();
        fileMappings[customId] = megaLink;

        // Respond with the custom link
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            url: `http://localhost:${PORT}/files/${customId}`
        });
    } catch (error) {
        console.error('Error uploading to MEGA:', error);
        res.status(500).json({ success: false, message: 'File upload failed' });
    }
});

// Endpoint to handle custom links
app.get('/files/:id', (req, res) => {
    const customId = req.params.id;

    if (!fileMappings[customId]) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Redirect to the actual MEGA link
    res.redirect(fileMappings[customId]);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
