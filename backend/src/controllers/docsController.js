import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getDocContent = (req, res) => {
  try {
    const { docId } = req.params;
    
    // Whitelist allowed docs to prevent directory traversal
    const allowedDocs = {
      'spatial-data-pipeline': 'SPATIAL_DATA_PIPELINE.md',
      'spatial-validation-enforcement': 'SPATIAL_VALIDATION_AND_ENFORCEMENT.md',
      'spatial-validation-audit': 'SPATIAL_VALIDATION_AUDIT.md'
    };

    const filename = allowedDocs[docId];
    if (!filename) {
      return res.status(404).json({ error: "Document not found" });
    }

    const docsPath = path.join(__dirname, '../../../docs', filename);
    
    if (!fs.existsSync(docsPath)) {
      return res.status(404).json({ error: "Documentation file not found on server" });
    }

    const content = fs.readFileSync(docsPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    console.error("Error reading docs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
