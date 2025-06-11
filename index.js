const express = require('express');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = 3000;

// Helper: Download file from URL
function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(outputPath);
            });
        }).on('error', reject);
    });
}

// POST endpoint to convert PPT to PDF
app.get('/convert', async (req, res) => {
    const fileUrl = decodeURIComponent((req.query.url || '').replace(/^"+|"+$/g, ''));
    console.log('🔗 Final URL:', fileUrl);

    try {
        new URL(fileUrl); // Will throw if malformed
    } catch (err) {
        return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!fileUrl) {
        return res.status(400).json({ error: 'Missing file URL' });
    }

    const tempPptPath = './temp.pptx';
    const outputDir = './output';
    const outputPdfPath = path.join(outputDir, 'converted.pdf');

    try {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        console.log('📥 Downloading PPTX...');
        await downloadFile(fileUrl, tempPptPath);

        console.log('🔄 Converting to PDF...');
        const command = `soffice --headless --convert-to pdf --outdir "${outputDir}" "${tempPptPath}"`;

        exec(command, (error, stdout, stderr) => {
            fs.unlinkSync(tempPptPath); // Clean up downloaded file

            if (error) {
                console.error('❌ Conversion error:', stderr || error.message);
                return res.status(500).json({ error: 'Conversion failed' });
            }

            // Find the actual output file name (LibreOffice renames to .pdf with same base name)
            const pdfFileName = path.basename(tempPptPath, path.extname(tempPptPath)) + '.pdf';
            const pdfFilePath = path.join(outputDir, pdfFileName);

            if (fs.existsSync(pdfFilePath)) {
                const dynamicName = `${Date.now()}.pdf`;
                res.download(pdfFilePath, dynamicName, (err) => {
                    fs.unlinkSync(pdfFilePath); // Cleanup after sending
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
    res.send('PPT to PDF Converter');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
