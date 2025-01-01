const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS
app.use(express.static(__dirname)); // Serve static files from the current directory

// Storage setup with Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

// Serve the `index.html` as the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    console.log("Received upload request");

    if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log("Uploaded file details:", req.file);

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log("Generated file URL:", fileUrl);

    // Responding properly to the client
    return res.status(200).json({
        success: true,
        message: "File uploaded successfully",
        url: fileUrl
    });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
