"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type Finding = {
  region_code: string | null;
  system: string | null;
  severity: string | null;
  finding_text: string | null;
};

const SEV: Record<string, string> = {
  none: "#d9c4a3",
  mild: "#f4a63c",
  moderate: "#ee7a4f",
  high: "#c0392b",
};
const SKIN = "#d9c4a3";

function sevOf(list: Finding[], region: string) {
  const f = list.find((x) => (x.region_code || "").toLowerCase() === region);
  return (f?.severity as string) || "none";
}
function colorFor(region: string, before: Finding[], after: Finding[], t: number) {
  const cb = new THREE.Color(SEV[sevOf(before, region)] ?? SKIN);
  const ca = new THREE.Color(SEV[sevOf(after, region)] ?? SKIN);
  return cb.lerp(ca, t);
}

function Part({
  region,
  before,
  after,
  t,
  selected,
  onSelect,
  position,
  children,
}: {
  region: string;
  before: Finding[];
  after: Finding[];
  t: number;
  selected: string;
  onSelect: (r: string) => void;
  position: [number, number, number];
  children: React.ReactNode;
}) {
  const color = colorFor(region, before, after, t);
  const isSel = selected === region;
  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(region);
      }}
    >
      {children}
      <meshStandardMaterial
        color={color}
        emissive={new THREE.Color(isSel ? "#14834e" : "#000000")}
        emissiveIntensity={isSel ? 0.55 : 0}
        roughness={0.65}
        metalness={0.05}
      />
    </mesh>
  );
}

function Figure({
  before,
  after,
  t,
  selected,
  onSelect,
}: {
  before: Finding[];
  after: Finding[];
  t: number;
  selected: string;
  onSelect: (r: string) => void;
}) {
  const shared = { before, after, t, selected, onSelect };
  return (
    <group position={[0, -0.4, 0]}>
      <Part region="head" {...shared} position={[0, 3.25, 0]}>
        <sphereGeometry args={[0.42, 32, 32]} />
      </Part>
      <mesh position={[0, 2.8, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.28, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      <Part region="chest" {...shared} position={[0, 2.25, 0]}>
        <boxGeometry args={[1.0, 0.85, 0.55]} />
      </Part>
      <Part region="abdomen" {...shared} position={[0, 1.5, 0]}>
        <boxGeometry args={[0.85, 0.7, 0.5]} />
      </Part>
      <Part region="adrenal" {...shared} position={[-0.28, 1.68, -0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </Part>
      <Part region="adrenal" {...shared} position={[0.28, 1.68, -0.16]}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </Part>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.8, 0.4, 0.45]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>
      {[-0.72, 0.72].map((x) => (
        <mesh key={x} position={[x, 2.15, 0]} rotation={[0, 0, x < 0 ? 0.18 : -0.18]}>
          <capsuleGeometry args={[0.13, 1.1, 8, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
      ))}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.1, 0]}>
          <capsuleGeometry args={[0.16, 1.3, 8, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export default function Body3D({
  before,
  after,
  t,
  selected,
  onSelect,
}: {
  before: Finding[];
  after: Finding[];
  t: number;
  selected: string;
  onSelect: (r: string) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 6.2], fov: 42 }}
      style={{ width: "100%", height: "100%" }}
      onPointerMissed={() => onSelect("")}
    >
      <color attach="background" args={["#fbf4e8"]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} />
      <Figure before={before} after={after} t={t} selected={selected} onSelect={onSelect} />
      <OrbitControls enablePan={false} minDistance={4} maxDistance={9} target={[0, 1.6, 0]} />
    </Canvas>
  );
}
