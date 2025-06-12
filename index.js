const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS for frontend (adjust origins as needed)
app.use(cors({
    origin: ['https://ppt.lynklms.com', 'http://localhost:3000'],
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type', 'Authorization']
    
}));

// Multer config - uploads go to 'uploads/' dir
const upload = multer({ dest: 'uploads/' });

// Main endpoint: Upload PPTX and convert to PDF
app.post('/convert', upload.single('pptFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PPTX file uploaded' });
    }

    const tempPptPath = req.file.path;
    const outputDir = './output';

    try {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        console.log(`🔄 Converting ${tempPptPath} to PDF...`);
        const command = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${tempPptPath}"`;

        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempPptPath); // Cleanup uploaded file

            if (error) {
                console.error('❌ Conversion error:', stderr || error.message);
                return res.status(500).json({ error: 'Conversion failed' });
            }

            const pdfFileName = path.basename(tempPptPath, path.extname(tempPptPath)) + '.pdf';
            const pdfFilePath = path.join(outputDir, pdfFileName);

            if (fs.existsSync(pdfFilePath)) {
                const dynamicName = `${Date.now()}.pdf`;
                res.download(pdfFilePath, dynamicName, (err) => {
                    fs.unlinkSync(pdfFilePath); // Cleanup PDF after sending
                });
            } else {
                res.status(500).json({ error: 'PDF not found after conversion' });
            }
        });
    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check or homepage
app.get('/', (req, res) => {
    res.send('🧾 PPT to PDF Converter live at ppt.lynklms.com');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://ppt.lynklms.com:${PORT}`);
});
