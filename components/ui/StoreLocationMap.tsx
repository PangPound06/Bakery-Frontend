"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// แก้ปัญหา marker icon หายเวลา bundle
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface Branch {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  hours?: string;
}

// ปรับ view: ถ้ามี focus → บินไปสาขานั้น, ไม่งั้นซูมให้เห็นทุกสาขา
function FitBounds({
  branches,
  focus,
}: {
  branches: Branch[];
  focus: Branch | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], 17);
      return;
    }
    if (branches.length === 1) {
      map.setView([branches[0].latitude, branches[0].longitude], 16);
    } else if (branches.length > 1) {
      const bounds = branches.map(
        (b) => [b.latitude, b.longitude] as [number, number],
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [branches, focus, map]);
  return null;
}

export default function StoreLocationMap({
  branches,
  focus = null,
}: {
  branches: Branch[];
  focus?: Branch | null;
}) {
  const center: [number, number] = branches.length
    ? [branches[0].latitude, branches[0].longitude]
    : [13.7563, 100.5018];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {branches.map((b) => (
        <Marker key={b.id} position={[b.latitude, b.longitude]}>
          <Popup>
            <strong>{b.name}</strong>
            {b.address ? (
              <>
                <br />
                {b.address}
              </>
            ) : null}
          </Popup>
        </Marker>
      ))}
      <FitBounds branches={branches} focus={focus} />
    </MapContainer>
  );
}