import test from 'node:test';
import assert from 'node:assert';
import { parseExif, stripExif } from '../services/scanners/exifParser';
import { parsePdf as parsePdfReal, stripPdf as stripPdfReal } from '../services/scanners/pdfParser';

test('Binary JPEG EXIF Parser', async (t) => {
  await t.test('Should return hasExif: false for empty buffer', () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = parseExif(emptyBuffer);
    assert.strictEqual(result.hasExif, false);
  });

  await t.test('Should return hasExif: false for invalid JPEG SOI', () => {
    const invalidJpg = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const result = parseExif(invalidJpg);
    assert.strictEqual(result.hasExif, false);
  });

  await t.test('Should safely return buffer when stripping invalid JPEG', () => {
    const invalidJpg = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const result = stripExif(invalidJpg);
    assert.deepStrictEqual(result, invalidJpg);
  });
});

test('Document PDF Metadata Parser', async (t) => {
  await t.test('Should extract basic fields from simulated PDF stream', () => {
    const pdfSim = `%PDF-1.4\n1 0 obj\n<< /Author (John Doe) /Creator (Aegis Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    const result = parsePdfReal(Buffer.from(pdfSim, 'binary'));
    assert.strictEqual(result.author, 'John Doe');
    assert.strictEqual(result.creator, 'Aegis Test');
    assert.strictEqual(result.hasMetadata, true);
  });

  await t.test('Should strip PDF metadata while preserving byte alignment lengths', () => {
    const pdfSim = `%PDF-1.4\n1 0 obj\n<< /Author (Johnathan) >>\nendobj\n%%EOF`;
    const cleanBuffer = stripPdfReal(Buffer.from(pdfSim, 'binary'));
    const cleanText = cleanBuffer.toString('binary');
    
    // Check that Johnathan was overwritten with "Anonymous" (both are 9 bytes)
    assert.ok(cleanText.includes('/Author (Anonymous)')); 
    assert.strictEqual(cleanBuffer.length, pdfSim.length); // Preserves exact byte size!
  });
});
