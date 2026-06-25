import { useEffect, useRef, useCallback } from 'react';

export const BALL_RADIUS = 28;
const GRAVITY = 0.3;
const DAMPING = 0.995;
const BOUNCE = 0.38;
const CURVE_FACTOR = 0.012; // lateral acceleration per unit of spin

export type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
};

type Options = {
  width: number;
  height: number;
  onUpdate: (ball: BallState) => void;
  onGrounded?: () => void;
};

export function usePhysics({ width, height, onUpdate, onGrounded }: Options) {
  const stateRef = useRef<BallState>({
    x: width / 2,
    y: height * 0.4,
    vx: 0,
    vy: 0,
    spin: 0,
  });
  const frozenRef = useRef(false);
  const rafRef = useRef<number>(0);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const onGroundedRef = useRef(onGrounded);
  onGroundedRef.current = onGrounded;

  useEffect(() => {
    if (!width || !height) return;
    stateRef.current = { x: width / 2, y: height * 0.4, vx: 0, vy: 0, spin: 0 };

    function loop() {
      if (!frozenRef.current) {
        const s = stateRef.current;
        s.vy += GRAVITY;
        // Spin causes lateral curve (Magnus effect)
        s.vx += s.spin * CURVE_FACTOR;
        s.vx *= DAMPING;
        s.vy *= DAMPING;
        s.x += s.vx;
        s.y += s.vy;
        s.spin += s.vx * 0.04;

        if (s.y + BALL_RADIUS > height) {
          s.y = height - BALL_RADIUS;
          s.vy = -Math.abs(s.vy) * BOUNCE;
          s.vx *= 0.8;
          onGroundedRef.current?.();
        }
        if (s.y - BALL_RADIUS < 0) {
          s.y = BALL_RADIUS;
          s.vy = Math.abs(s.vy) * BOUNCE;
        }
        if (s.x - BALL_RADIUS < 0) {
          s.x = BALL_RADIUS;
          s.vx = Math.abs(s.vx) * BOUNCE;
        }
        if (s.x + BALL_RADIUS > width) {
          s.x = width - BALL_RADIUS;
          s.vx = -Math.abs(s.vx) * BOUNCE;
        }

        onUpdateRef.current({ ...s });
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [width, height]);

  const juggle = useCallback((touchX: number, touchY: number) => {
    const s = stateRef.current;
    const dx = touchX - s.x;
    const dy = touchY - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > BALL_RADIUS * 3.5) return;
    s.vy = -14;
    s.vx += dx * 0.08;
    s.spin += dx * -0.05;
  }, []);

  const trapBall = useCallback(() => {
    frozenRef.current = true;
    const s = stateRef.current;
    s.vx = 0;
    s.vy = 0;
  }, []);

  const releaseBall = useCallback(() => {
    frozenRef.current = false;
  }, []);

  const shoot = useCallback((angle: number, power: number, spin: number) => {
    frozenRef.current = false;
    const speed = power * 0.4;
    const s = stateRef.current;
    s.vx = Math.cos(angle) * speed;
    s.vy = Math.sin(angle) * speed;
    s.spin = spin;
  }, []);

  const getBallPos = useCallback(() => {
    return { x: stateRef.current.x, y: stateRef.current.y };
  }, []);

  return { juggle, trapBall, releaseBall, shoot, getBallPos };
}
