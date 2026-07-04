export interface PdfMetadata {
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modDate?: string;
  title?: string;
  hasMetadata: boolean;
}

export function parsePdf(buffer: Buffer): PdfMetadata {
  const result: PdfMetadata = { hasMetadata: false };

  try {
    const pdfText = buffer.toString('binary');
    
    // Find basic document info matches in the trailer dictionary
    result.author = decodePdfString(extractPdfKey(pdfText, '/Author'));
    result.creator = decodePdfString(extractPdfKey(pdfText, '/Creator'));
    result.producer = decodePdfString(extractPdfKey(pdfText, '/Producer'));
    result.creationDate = formatPdfDate(extractPdfKey(pdfText, '/CreationDate'));
    result.modDate = formatPdfDate(extractPdfKey(pdfText, '/ModDate'));
    result.title = decodePdfString(extractPdfKey(pdfText, '/Title'));

    if (result.author || result.creator || result.producer || result.title) {
      result.hasMetadata = true;
    }
  } catch (error) {
    console.error('Error parsing PDF metadata:', error);
  }

  return result;
}

// Byte-preserving PDF stripper to ensure the internal cross-reference offset tables remain valid
export function stripPdf(buffer: Buffer): Buffer {
  try {
    let pdfText = buffer.toString('binary');
    const keysToStrip = ['/Author', '/Creator', '/Producer', '/Title'];

    let modified = false;
    for (const key of keysToStrip) {
      // Match key and its parentheses content, e.g., /Author (John Doe)
      const regex = new RegExp(`${key}\\s*\\(([^)]*)\\)`, 'g');
      
      pdfText = pdfText.replace(regex, (_, content) => {
        modified = true;
        // Replace content with "Anonymous" padded with spaces to match exact original length
        const targetLen = content.length;
        let replacement = 'Anonymous';
        if (replacement.length < targetLen) {
          replacement = replacement.padEnd(targetLen, ' ');
        } else if (replacement.length > targetLen) {
          replacement = replacement.substring(0, targetLen);
        }
        return `${key} (${replacement})`;
      });
    }

    if (modified) {
      return Buffer.from(pdfText, 'binary');
    }
  } catch (error) {
    console.error('Error stripping PDF metadata:', error);
  }

  return buffer;
}

// Helpers
function extractPdfKey(pdfText: string, keyName: string): string | undefined {
  // Regex to extract content inside parenthesis or hex tag, e.g., /Key (value) or /Key <FEFF0041>
  const regex = new RegExp(`${keyName}\\s*(?:\\(([^)]*)\\)|<([^>]*)>)`);
  const match = pdfText.match(regex);
  if (!match) return undefined;

  // Group 1 matches standard strings (parentheses), Group 2 matches hex strings (<...>)
  return match[1] !== undefined ? match[1] : match[2];
}

function decodePdfString(val: string | undefined): string | undefined {
  if (!val) return undefined;

  // If it is a hex string (e.g. starts with FEFF representing UTF-16BE)
  if (/^[0-9a-fA-F]+$/.test(val)) {
    try {
      const hexBuf = Buffer.from(val, 'hex');
      // If it starts with BOM for UTF-16BE (0xFE 0xFF)
      if (hexBuf[0] === 0xFE && hexBuf[1] === 0xFF) {
        return hexBuf.subarray(2).toString('utf16le'); // Swap endianness if read on LE systems
      }
      return hexBuf.toString('utf8');
    } catch {
      return val;
    }
  }

  // Remove escape slashes from PDF parenthesis
  return val.replace(/\\([\(\)])/g, '$1').trim();
}

function formatPdfDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  
  // PDF Date format is usually: D:YYYYMMDDHHmmSSOHH'mm'
  // e.g. D:20260704221500Z or D:20260704221500+05'30'
  const cleaned = dateStr.replace(/^D:/, '').replace(/'/g, '');
  if (cleaned.length >= 8) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return cleaned;
}
