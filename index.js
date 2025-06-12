const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;

// Multer setup to store uploaded files in `uploads/`
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

// POST endpoint to convert uploaded PPT to PDF
app.post('/convert', upload.single('pptFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PPTX file uploaded' });
    }

    const tempPptPath = req.file.path;
    const outputDir = './output';

    try {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        console.log('🔄 Converting to PDF...');
        const command = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${tempPptPath}"`;

        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempPptPath); // Delete original PPT file

            if (error) {
                console.error('❌ Conversion error:', stderr || error.message);
                return res.status(500).json({ error: 'Conversion failed' });
            }

            const pdfFileName = path.basename(tempPptPath, path.extname(tempPptPath)) + '.pdf';
            const pdfFilePath = path.join(outputDir, pdfFileName);

            if (fs.existsSync(pdfFilePath)) {
                const dynamicName = `${Date.now()}.pdf`;
                res.download(pdfFilePath, dynamicName, (err) => {
                    fs.unlinkSync(pdfFilePath); // Clean up after sending
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

app.get('/', (req, res) => {
    res.send('Upload PPTX and Convert to PDF');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
