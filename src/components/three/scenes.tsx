import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MotionValue } from 'framer-motion';

/* ────────────────────────────────────────────────────────────────
   WebGL layer — wireframe court cathedral + fluoro ball satellites.
   Built on raw R3F primitives, additive glow, heavy fog.
   ──────────────────────────────────────────────────────────────── */

const ACE = '#D7FF3E';
const CHALK = '#EDF2E4';

/** Regulation tennis court traced as glowing line segments (1 unit ≈ 10ft). */
const courtPositions = () => {
    const W = 1.8;   // half doubles width
    const SW = 1.35; // half singles width
    const L = 3.9;   // half length
    const SL = 2.1;  // service line from net
    const pts: number[] = [];
    const seg = (x1: number, z1: number, x2: number, z2: number) =>
        pts.push(x1, 0, z1, x2, 0, z2);

    // outer doubles rectangle
    seg(-W, -L, W, -L); seg(W, -L, W, L); seg(W, L, -W, L); seg(-W, L, -W, -L);
    // singles sidelines
    seg(-SW, -L, -SW, L); seg(SW, -L, SW, L);
    // service lines
    seg(-SW, -SL, SW, -SL); seg(-SW, SL, SW, SL);
    // center service line + net line
    seg(0, -SL, 0, SL); seg(-W, 0, W, 0);
    // baseline center marks
    seg(0, -L, 0, -L + 0.15); seg(0, L, 0, L - 0.15);

    return new Float32Array(pts);
};

const CourtLines = ({ color = ACE, opacity = 0.9 }: { color?: string; opacity?: number }) => {
    const positions = useMemo(() => courtPositions(), []);
    return (
        <lineSegments>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} />
        </lineSegments>
    );
};

const NetPlane = () => {
    return (
        <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[3.6, 0.36, 24, 4]} />
            <meshBasicMaterial
                color={CHALK}
                wireframe
                transparent
                opacity={0.16}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

/** deterministic PRNG so particle fields stay stable across re-renders */
const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const Particles = ({ count = 700, spread = 26 }: { count?: number; spread?: number }) => {
    const positions = useMemo(() => {
        const rand = mulberry32(count * 7919 + spread * 31);
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (rand() - 0.5) * spread;
            arr[i * 3 + 1] = rand() * 9 - 1.5;
            arr[i * 3 + 2] = (rand() - 0.5) * spread;
        }
        return arr;
    }, [count, spread]);

    const ref = useRef<THREE.Points>(null);
    useFrame(({ clock }) => {
        if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial
                color={CHALK}
                size={0.022}
                sizeAttenuation
                transparent
                opacity={0.45}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
};

const FluoroBall = ({
    radius = 0.5,
    position = [0, 1.6, 0] as [number, number, number],
    bob = true,
}: {
    radius?: number;
    position?: [number, number, number];
    bob?: boolean;
}) => {
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (!group.current) return;
        const t = clock.elapsedTime;
        group.current.rotation.y = t * 0.35;
        group.current.rotation.x = Math.sin(t * 0.4) * 0.25;
        if (bob) group.current.position.y = position[1] + Math.sin(t * 1.1) * 0.18;
    });

    return (
        <group ref={group} position={position}>
            <mesh>
                <icosahedronGeometry args={[radius, 2]} />
                <meshBasicMaterial
                    color={ACE}
                    wireframe
                    transparent
                    opacity={0.55}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[radius * 0.55, 1]} />
                <meshBasicMaterial
                    color={CHALK}
                    wireframe
                    transparent
                    opacity={0.3}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>
        </group>
    );
};

/* ── HERO: court cathedral flythrough ─────────────────────────── */

const HeroRig = ({ scrollProgress }: { scrollProgress: MotionValue<number> }) => {
    const world = useRef<THREE.Group>(null);

    useFrame(({ camera, pointer, clock }) => {
        const p = scrollProgress.get();
        const t = clock.elapsedTime;

        // drift + mouse parallax + scroll dolly
        const targetX = pointer.x * 0.9;
        const targetY = 2.1 + pointer.y * -0.5 + p * 2.4;
        const targetZ = 6.8 - p * 3.4;
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        camera.position.z += (targetZ - camera.position.z) * 0.07;
        camera.lookAt(0, 0.35, 0);

        if (world.current) {
            world.current.rotation.y = Math.sin(t * 0.08) * 0.12 + p * 0.7;
        }
    });

    return (
        <group ref={world}>
            <gridHelper args={[44, 60, '#15200F', '#0D130C']} position={[0, -0.02, 0]} />
            <CourtLines />
            {/* ghost echoes of the court stacked into the void */}
            <group position={[0, 1.7, 0]} scale={0.72}>
                <CourtLines color={CHALK} opacity={0.10} />
            </group>
            <group position={[0, 3.2, 0]} scale={0.5}>
                <CourtLines color={CHALK} opacity={0.05} />
            </group>
            <NetPlane />
            <FluoroBall position={[1.6, 1.7, -0.6]} radius={0.42} />
            <FluoroBall position={[-2.3, 2.6, -2.2]} radius={0.2} />
            <Particles />
        </group>
    );
};

export const HeroScene = ({ scrollProgress }: { scrollProgress: MotionValue<number> }) => (
    <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 50, position: [0, 2.1, 6.8], near: 0.1, far: 60 }}
        style={{ position: 'absolute', inset: 0 }}
    >
        <fog attach="fog" args={['#070907', 5.5, 19]} />
        <HeroRig scrollProgress={scrollProgress} />
    </Canvas>
);

/* ── AIRLOCK: lone satellite over a sunken court ──────────────── */

const AirlockRig = () => {
    const world = useRef<THREE.Group>(null);
    useFrame(({ camera, pointer, clock }) => {
        camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
        camera.position.y += (1.4 + pointer.y * -0.3 - camera.position.y) * 0.04;
        camera.lookAt(0, 0.7, 0);
        if (world.current) world.current.rotation.y = clock.elapsedTime * 0.06;
    });

    return (
        <group ref={world}>
            <gridHelper args={[30, 44, '#15200F', '#0C110B']} position={[0, -0.55, 0]} />
            <group position={[0, -0.5, 0]}>
                <CourtLines opacity={0.5} />
            </group>
            <FluoroBall position={[0, 1.05, 0]} radius={0.72} />
            <Particles count={420} spread={18} />
        </group>
    );
};

export const AirlockScene = () => (
    <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 46, position: [0, 1.4, 5.4], near: 0.1, far: 50 }}
        style={{ position: 'absolute', inset: 0 }}
    >
        <fog attach="fog" args={['#070907', 4.5, 15]} />
        <AirlockRig />
    </Canvas>
);
