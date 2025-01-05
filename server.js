const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { Storage } = require('megajs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3000;
//.
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
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (e.g., index.html)

// Temporary file storage
const upload = multer({ dest: 'temp/' });

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileSize = fs.statSync(filePath).size; // Get the file size

        // Upload file to MEGA with file size specified
        const megaFile = megaStorage.upload({
            name: fileName,
            size: fileSize,
            allowUploadBuffering: true // Enable buffering
        });

        fs.createReadStream(filePath).pipe(megaFile);

        // Wait for the upload to complete
        const megaFileDetails = await new Promise((resolve, reject) => {
            megaFile.on('complete', resolve);
            megaFile.on('error', reject);
        });

        const megaLink = await new Promise((resolve, reject) => {
            megaFileDetails.link((err, url) => {
                if (err) return reject(err);
                resolve(url);
            });
        });

        // Remove temporary file
        fs.unlinkSync(filePath);

        // Generate a unique custom link
        const customId = uuidv4();
        fileMappings[customId] = { megaLink, fileName };

        // Respond with the custom link
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            url: `http://nikka-upload.onrender.com/files/${customId}`
        });
    } catch (error) {
        console.error('Error uploading to MEGA:', error);
        res.status(500).json({ success: false, message: 'File upload failed' });
    }
});

// Proxy endpoint for direct download
app.get('/files/:id', (req, res) => {
    const customId = req.params.id;

    if (!fileMappings[customId]) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }

    const { megaLink, fileName } = fileMappings[customId];

    // Stream the file directly from MEGA
    http.get(megaLink, (megaResponse) => {
        if (megaResponse.statusCode !== 200) {
            return res.status(500).json({ success: false, message: 'Error accessing MEGA file' });
        }

        // Set the appropriate headers and pipe the file
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', megaResponse.headers['content-type']);
        megaResponse.pipe(res);
    }).on('error', (err) => {
        console.error('Error streaming file:', err);
        res.status(500).json({ success: false, message: 'Error downloading file' });
    });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
