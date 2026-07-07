export interface ExifData {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  gps?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    locationName?: string;
    aiEstimated?: boolean;
    reason?: string;
  };
  hasExif: boolean;
}

// Custom parser to read basic EXIF tags from a JPEG Buffer from scratch
export function parseExif(buffer: Buffer): ExifData {
  const result: ExifData = { hasExif: false };

  try {
    // Check if it is a valid JPEG
    if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return result;
    }

    let offset = 2;
    while (offset < buffer.length - 1) {
      // Find APP1 Marker (0xFFE1)
      if (buffer[offset] === 0xFF && buffer[offset + 1] === 0xE1) {
        result.hasExif = true;
        const app1Length = buffer.readUInt16BE(offset + 2);
        const app1Start = offset + 4;
        const app1End = app1Start + app1Length - 2;

        // Verify "Exif\0\0" Header
        if (
          buffer.readUint32BE(app1Start) === 0x45786966 && // "Exif"
          buffer.readUint16BE(app1Start + 4) === 0x0000 // "\0\0"
        ) {
          const tiffHeaderStart = app1Start + 6;
          
          // Byte Alignment
          const byteAlign = buffer.toString('ascii', tiffHeaderStart, tiffHeaderStart + 2);
          const isLittleEndian = byteAlign === 'II';

          const readUint16 = (o: number) => isLittleEndian ? buffer.readUInt16LE(o) : buffer.readUInt16BE(o);
          const readUint32 = (o: number) => isLittleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);

          // TIFF Tag ID check (should be 0x002A / 0x2A00)
          const tiffId = readUint16(tiffHeaderStart + 2);
          if (tiffId !== 0x002A) {
            return result; // Invalid TIFF ID
          }

          const firstIfdOffset = readUint32(tiffHeaderStart + 4);
          let ifdOffset = tiffHeaderStart + firstIfdOffset;

          const tagsCount = readUint16(ifdOffset);
          let gpsInfoOffset = 0;

          // Scan Main IFD0 Tags
          for (let i = 0; i < tagsCount; i++) {
            const tagEntry = ifdOffset + 2 + (i * 12);
            if (tagEntry + 12 > app1End) break;

            const tagId = readUint16(tagEntry);
            const count = readUint32(tagEntry + 4);
            const valOffset = readUint32(tagEntry + 8);

            // Make: 0x010F
            if (tagId === 0x010F) {
              result.make = readString(buffer, tiffHeaderStart + valOffset, count);
            }
            // Model: 0x0110
            else if (tagId === 0x0110) {
              result.model = readString(buffer, tiffHeaderStart + valOffset, count);
            }
            // Software: 0x0131
            else if (tagId === 0x0131 || tagId === 0x0132) {
              if (tagId === 0x0131) {
                result.software = readString(buffer, tiffHeaderStart + valOffset, count);
              } else {
                result.dateTime = readString(buffer, tiffHeaderStart + valOffset, count);
              }
            }
            // GPSInfo offset tag: 0x8825
            else if (tagId === 0x8825) {
              gpsInfoOffset = valOffset;
            }
          }

          // Scan GPS IFD Subdirectory
          if (gpsInfoOffset > 0) {
            const gpsOffset = tiffHeaderStart + gpsInfoOffset;
            if (gpsOffset < app1End) {
              const gpsTagsCount = readUint16(gpsOffset);
              let latRef = 'N';
              let lonRef = 'E';
              let latParts: number[] = [];
              let lonParts: number[] = [];
              let alt = 0;
              let altRef = 0;

              for (let j = 0; j < gpsTagsCount; j++) {
                const gpsEntry = gpsOffset + 2 + (j * 12);
                if (gpsEntry + 12 > app1End) break;

                const tagId = readUint16(gpsEntry);
                const count = readUint32(gpsEntry + 4);
                const valOffset = readUint32(gpsEntry + 8);

                // GPSLatitudeRef: 0x0001
                if (tagId === 0x0001) {
                  latRef = buffer.toString('ascii', gpsEntry + 8, gpsEntry + 9);
                }
                // GPSLatitude: 0x0002
                else if (tagId === 0x0002) {
                  latParts = readRationalArray(buffer, tiffHeaderStart + valOffset, count, isLittleEndian);
                }
                // GPSLongitudeRef: 0x0003
                else if (tagId === 0x0003) {
                  lonRef = buffer.toString('ascii', gpsEntry + 8, gpsEntry + 9);
                }
                // GPSLongitude: 0x0004
                else if (tagId === 0x0004) {
                  lonParts = readRationalArray(buffer, tiffHeaderStart + valOffset, count, isLittleEndian);
                }
                // GPSAltitudeRef: 0x0005
                else if (tagId === 0x0005) {
                  altRef = buffer[gpsEntry + 8]; // 0 = above sea level, 1 = below sea level
                }
                // GPSAltitude: 0x0006
                else if (tagId === 0x0006) {
                  const rationals = readRationalArray(buffer, tiffHeaderStart + valOffset, count, isLittleEndian);
                  if (rationals.length > 0) alt = rationals[0];
                }
              }

              if (latParts.length === 3 && lonParts.length === 3) {
                let latitude = latParts[0] + (latParts[1] / 60) + (latParts[2] / 3600);
                let longitude = lonParts[0] + (lonParts[1] / 60) + (lonParts[2] / 3600);

                if (latRef === 'S') latitude = -latitude;
                if (lonRef === 'W') longitude = -longitude;

                result.gps = {
                  latitude: parseFloat(latitude.toFixed(6)),
                  longitude: parseFloat(longitude.toFixed(6)),
                  altitude: altRef === 1 ? -alt : alt
                };
              }
            }
          }
        }
        break;
      }
      
      // Move to next segment
      if (buffer[offset] === 0xFF && buffer[offset + 1] >= 0xD0 && buffer[offset + 1] <= 0xD9) {
        offset += 2;
      } else if (buffer[offset] === 0xFF) {
        const segLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLength;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.error('Error parsing EXIF binary:', err);
  }

  return result;
}

// Strips the APP1 metadata segment from raw JPEG buffer to clean it completely
export function stripExif(buffer: Buffer): Buffer {
  try {
    if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      return buffer; // Return original if not valid JPEG
    }

    const segments: Buffer[] = [buffer.subarray(0, 2)]; // Start with SOI (0xFFD8)
    let offset = 2;

    while (offset < buffer.length - 1) {
      // Check for APP1 Segment Marker (0xFFE1)
      if (buffer[offset] === 0xFF && buffer[offset + 1] === 0xE1) {
        const segLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLength; // Skip this metadata segment entirely
      } 
      // Handle normal JPEG markers
      else if (buffer[offset] === 0xFF && buffer[offset + 1] >= 0xD0 && buffer[offset + 1] <= 0xD9) {
        segments.push(buffer.subarray(offset, offset + 2));
        offset += 2;
      } else if (buffer[offset] === 0xFF) {
        const segLength = buffer.readUInt16BE(offset + 2);
        segments.push(buffer.subarray(offset, offset + 2 + segLength));
        offset += 2 + segLength;
      } else {
        // Find next marker or append remainder of file (SOS data)
        const nextMarker = buffer.indexOf(0xFF, offset);
        if (nextMarker === -1 || nextMarker === offset) {
          segments.push(buffer.subarray(offset));
          break;
        } else {
          segments.push(buffer.subarray(offset, nextMarker));
          offset = nextMarker;
        }
      }
    }

    return Buffer.concat(segments);
  } catch (err) {
    console.error('Error stripping EXIF metadata:', err);
    return buffer;
  }
}

// Helpers
function readString(buffer: Buffer, start: number, count: number): string {
  const str = buffer.toString('ascii', start, start + count);
  return str.replace(/\0+$/, '').trim(); // Remove trailing nulls
}

function readRationalArray(buffer: Buffer, start: number, count: number, isLittleEndian: boolean): number[] {
  const values: number[] = [];
  const readUint32 = (o: number) => isLittleEndian ? buffer.readUInt32LE(o) : buffer.readUInt32BE(o);

  for (let i = 0; i < count; i++) {
    const numOffset = start + (i * 8);
    const num = readUint32(numOffset);
    const den = readUint32(numOffset + 4);
    if (den === 0) continue;
    values.push(num / den);
  }

  return values;
}
