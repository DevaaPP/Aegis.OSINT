import AdmZip from 'adm-zip';

export interface DocxMetadata {
  creator?: string;
  lastModifiedBy?: string;
  revision?: string;
  created?: string;
  modified?: string;
  company?: string;
  template?: string;
  application?: string;
  hasMetadata: boolean;
}

export function parseDocx(buffer: Buffer): DocxMetadata {
  const result: DocxMetadata = { hasMetadata: false };

  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // 1. Read docProps/core.xml
    const coreEntry = zipEntries.find((entry) => entry.entryName === 'docProps/core.xml');
    if (coreEntry) {
      const coreXml = coreEntry.getData().toString('utf8');
      result.hasMetadata = true;
      result.creator = extractXmlTag(coreXml, 'dc:creator');
      result.lastModifiedBy = extractXmlTag(coreXml, 'cp:lastModifiedBy');
      result.revision = extractXmlTag(coreXml, 'cp:revision');
      result.created = extractXmlTag(coreXml, 'dcterms:created');
      result.modified = extractXmlTag(coreXml, 'dcterms:modified');
    }

    // 2. Read docProps/app.xml
    const appEntry = zipEntries.find((entry) => entry.entryName === 'docProps/app.xml');
    if (appEntry) {
      const appXml = appEntry.getData().toString('utf8');
      result.company = extractXmlTag(appXml, 'Company');
      result.template = extractXmlTag(appXml, 'Template');
      result.application = extractXmlTag(appXml, 'Application');
    }
  } catch (error) {
    console.error('Error parsing DOCX metadata:', error);
  }

  return result;
}

export function stripDocx(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);

    const cleanCoreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:creator>Anonymous</dc:creator>
  <cp:keywords></cp:keywords>
  <dc:description></dc:description>
  <cp:lastModifiedBy>Anonymous</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;

    const cleanAppXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Template>Normal</Template>
  <TotalTime>0</TotalTime>
  <Pages>1</Pages>
  <Words>0</Words>
  <Characters>0</Characters>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Lines>1</Lines>
  <Paragraphs>1</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <Company>Anonymous</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>0</CharactersWithSpaces>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

    // Overwrite the metadata files inside the zip
    zip.addFile('docProps/core.xml', Buffer.from(cleanCoreXml, 'utf8'));
    zip.addFile('docProps/app.xml', Buffer.from(cleanAppXml, 'utf8'));

    return zip.toBuffer();
  } catch (error) {
    console.error('Error stripping DOCX metadata:', error);
    return buffer;
  }
}

// Extract tag value using standard string manipulation (safer/faster than heavy DOM parsers for simple XML)
function extractXmlTag(xml: string, tagName: string): string | undefined {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const start = xml.indexOf(openTag);
  if (start === -1) return undefined;
  
  const end = xml.indexOf(closeTag, start);
  if (end === -1) return undefined;

  return xml.substring(start + openTag.length, end).trim();
}
