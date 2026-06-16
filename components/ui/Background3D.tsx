"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

// โทนสีเบเกอรี่ (amber/orange/cream)
const COLORS = ["#f59e0b", "#fbbf24", "#fdba74", "#fcd34d", "#fb923c"];

function Orbs({ count = 14 }: { count?: number }) {
  const group = useRef<THREE.Group>(null);

  // สุ่มตำแหน่ง/ขนาด/สี ครั้งเดียว (ไม่สุ่มใหม่ทุกเฟรม)
  const items = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        position: [
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 11,
          (Math.random() - 0.5) * 6,
        ] as [number, number, number],
        scale: 0.4 + Math.random() * 1.0,
        color: COLORS[i % COLORS.length],
        speed: 0.5 + Math.random() * 1.2,
        rot: Math.random() * Math.PI,
      })),
    [count],
  );

  // หมุนทั้งกลุ่มช้าๆ
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.04;
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <Float
          key={i}
          speed={it.speed}
          rotationIntensity={0.6}
          floatIntensity={1.3}
        >
          <mesh position={it.position} scale={it.scale} rotation={[it.rot, it.rot, 0]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial
              color={it.color}
              roughness={0.45}
              metalness={0.1}
              transparent
              opacity={0.85}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/**
 * 3D background animation — ลูกกลมโทน amber ลอย/หมุนช้าๆ
 *  - ตัว Canvas จะเต็มพื้นที่ของ "กล่องแม่" (parent ต้องมีขนาด)
 *  - ใส่ pointer-events-none ไว้แล้ว ไม่บังการคลิกเนื้อหา
 *  - วิธีใช้: ดูคอมเมนต์ท้ายไฟล์
 */
export default function Background3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, 2]} intensity={0.4} color="#fff7ed" />
      <Orbs />
    </Canvas>
  );
}