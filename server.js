const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { mega } = require('mega');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MEGA credentials
const MEGA_EMAIL = 'maxwellexcel2@gmail.com;
const MEGA_PASSWORD = 'mynameisexcel2';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Multer for temporary file storage
const upload = multer({ dest: 'temp/' });

// Load or initialize mappings
const mappingsFile = path.join(__dirname, 'mappings.json');
const mappings = fs.existsSync(mappingsFile) ? JSON.parse(fs.readFileSync(mappingsFile)) : {};

// Save mappings to file
const saveMappings = () => {
    fs.writeFileSync(mappingsFile, JSON.stringify(mappings, null, 2));
};

// MEGA uploader function
const uploadToMega = async (filePath, fileName) => {
    const storage = await mega({ email: MEGA_EMAIL, password: MEGA_PASSWORD }).ready;
    const uploadStream = storage.upload({ name: fileName });
    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(uploadStream);

    return new Promise((resolve, reject) => {
        uploadStream.on('complete', file => resolve(file.link));
        uploadStream.on('error', err => reject(err));
    });
};

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Upload to MEGA
        const megaLink = await uploadToMega(filePath, fileName);

        // Generate custom file ID
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Store mapping
        mappings[fileId] = megaLink;
        saveMappings();

        // Delete local file
        fs.unlinkSync(filePath);

        // Respond with custom URL
        const customLink = `${req.protocol}://${req.get('host')}/files/${fileId}`;
        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            url: customLink
        });
    } catch (err) {
        console.error('Error during file upload:', err);
        return res.status(500).json({ success: false, message: 'File upload failed' });
    }
});

// Redirect custom link to MEGA
app.get('/files/:id', (req, res) => {
    const fileId = req.params.id;
    const megaLink = mappings[fileId];

    if (!megaLink) {
        return res.status(404).send('File not found');
    }

    // Redirect to the actual MEGA link
    res.redirect(megaLink);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
