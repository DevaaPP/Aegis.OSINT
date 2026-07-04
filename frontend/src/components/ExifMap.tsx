'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Re-map Leaflet Marker Icon to prevent Webpack path resolution errors in NextJS
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ExifMapProps {
  latitude: number;
  longitude: number;
  popupText?: string;
}

export default function ExifMap({ latitude, longitude, popupText = 'Photo Capture Geolocation' }: ExifMapProps) {
  useEffect(() => {
    // Force Leaflet container recalculation on coordinate updates
    window.dispatchEvent(new Event('resize'));
  }, [latitude, longitude]);

  return (
    <div className="w-full h-full min-h-[250px] border border-cyber-blue/15 rounded-xl overflow-hidden shadow-inner">
      <MapContainer 
        center={[latitude, longitude]} 
        zoom={13} 
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={customIcon}>
          <Popup>
            <div className="text-xs font-mono font-bold text-cyber-gray">
              {popupText} <br />
              [{latitude.toFixed(4)}, {longitude.toFixed(4)}]
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
