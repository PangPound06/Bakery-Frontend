"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// แก้ marker icon หายเวลา bundle
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * แผนที่สำหรับ "คลิกปักหมุด" เพื่อกำหนดพิกัดสาขา
 *  - คลิกที่ไหนบนแผนที่ → ส่ง lat/lng กลับผ่าน onChange
 *  - ลากหมุดเพื่อปรับตำแหน่งละเอียดได้
 */
export default function BranchLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const hasPos =
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng);
  const center: [number, number] = hasPos
    ? [lat as number, lng as number]
    : [13.7563, 100.5018];

  return (
    <MapContainer
      center={center}
      zoom={hasPos ? 16 : 12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      {hasPos && (
        <Marker
          position={[lat as number, lng as number]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target.getLatLng();
              onChange(m.lat, m.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}