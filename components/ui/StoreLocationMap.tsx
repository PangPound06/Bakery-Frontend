"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// แก้ปัญหา marker icon หายเวลา bundle (ชี้ icon ไป CDN ของ leaflet)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat: number;
  lng: number;
  name: string;
}

/**
 * แผนที่ Leaflet + OpenStreetMap (ฟรี ไม่ต้องใช้ API key)
 * โหลดเฉพาะฝั่ง client เท่านั้น (ดูวิธี import ใน StoreLocationSection)
 */
export default function StoreLocationMap({ lat, lng, name }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          <strong>{name}</strong>
        </Popup>
      </Marker>
    </MapContainer>
  );
}