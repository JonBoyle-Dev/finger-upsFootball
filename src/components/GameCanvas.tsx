import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Ellipse,
  Path,
  Rect,
} from 'react-native-svg';
import { usePhysics, BallState, BALL_RADIUS } from '../hooks/usePhysics';

type GamePhase = 'juggling' | 'trapped' | 'aiming' | 'shot';

const GOALKEEPER_Y_RATIO = 0.2;
const GOAL_WIDTH = 220;
const GOAL_HEIGHT = 100;
const GK_RADIUS = 18;
const TRAP_UNLOCK_BASE = 5;
const TRAP_UNLOCK_INCREMENT = 5;
const SHOT_TIMER_SECS = 10;

const OVER_BAR_POWER_THRESHOLD = 75;
const OVER_BAR_CLOSE_DISTANCE = 180;

// Wall constants
const WALL_PLAYER_W = 28;
const WALL_PLAYER_H = 64;
const WALL_GAP = 4;
const WALL_TOTAL_W = WALL_PLAYER_W * 2 + WALL_GAP;

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 35);
}

// Simulate ball physics for N steps to compute curved trajectory
function simulatePath(
  startX: number, startY: number,
  vx: number, vy: number,
  spin: number,
  steps: number,
): { x: number; y: number }[] {
  const GRAVITY = 0.3;
  const DAMPING = 0.995;
  const CURVE_FACTOR = 0.008;
  const SPIN_DECAY = 0.97;
  let x = startX, y = startY, cvx = vx, cvy = vy, cspin = spin;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    cvy += GRAVITY;
    cvx += cspin * CURVE_FACTOR;
    cvx *= DAMPING;
    cvy *= DAMPING;
    x += cvx;
    y += cvy;
    cspin += cvx * 0.04;
    cspin *= SPIN_DECAY;
    pts.push({ x, y });
  }
  return pts;
}

function SoccerBall({ x, y }: { x: Animated.Value; y: Animated.Value }) {
  return (
    <Animated.Image
      source={require('../../assets/soccerball.png')}
      style={[styles.ball, { left: x, top: y }]}
    />
  );
}

const GK_WIDTH = 70;
const GK_HEIGHT = 95;

function GoalkeeperSvg() {
  return (
    <Svg width={GK_WIDTH} height={GK_HEIGHT} viewBox="0 0 110 160">
      {/* Left leg */}
      <Rect x="28" y="100" width="22" height="34" rx="8" fill="#e8232a"/>
      <Rect x="29" y="120" width="20" height="20" rx="6" fill="#4ec3f5"/>
      <Ellipse cx="39" cy="142" rx="16" ry="9" fill="#2255cc"/>
      {/* Right leg */}
      <Rect x="60" y="100" width="22" height="34" rx="8" fill="#e8232a"/>
      <Rect x="61" y="120" width="20" height="20" rx="6" fill="#4ec3f5"/>
      <Ellipse cx="71" cy="142" rx="16" ry="9" fill="#2255cc"/>
      {/* Body */}
      <Rect x="26" y="60" width="58" height="50" rx="12" fill="#f5c800"/>
      {/* Jersey number */}
      <Path d="M52 68 L52 98 M46 70 L52 68" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      {/* Left arm */}
      <Rect x="0" y="62" width="28" height="18" rx="9" fill="#f5c800"/>
      <Ellipse cx="8" cy="71" rx="14" ry="12" fill="#2d2d3a"/>
      <Rect x="0" y="58" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="10" y="55" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="20" y="57" width="9" height="14" rx="4" fill="#2d2d3a"/>
      {/* Right arm */}
      <Rect x="82" y="62" width="28" height="18" rx="9" fill="#f5c800"/>
      <Ellipse cx="102" cy="71" rx="14" ry="12" fill="#2d2d3a"/>
      <Rect x="101" y="58" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="91" y="55" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="81" y="57" width="9" height="14" rx="4" fill="#2d2d3a"/>
      {/* Neck */}
      <Rect x="45" y="44" width="20" height="20" rx="6" fill="#f5a623"/>
      {/* Head */}
      <Ellipse cx="55" cy="30" rx="28" ry="30" fill="#f5a623"/>
      {/* Hair */}
      <Ellipse cx="55" cy="8" rx="26" ry="14" fill="#8B4513"/>
      <Ellipse cx="32" cy="18" rx="10" ry="14" fill="#8B4513"/>
      <Ellipse cx="78" cy="18" rx="10" ry="14" fill="#8B4513"/>
      <Ellipse cx="42" cy="7" rx="10" ry="8" fill="#a0522d"/>
      <Ellipse cx="55" cy="4" rx="10" ry="7" fill="#a0522d"/>
      <Ellipse cx="68" cy="7" rx="9" ry="7" fill="#a0522d"/>
      {/* Ears */}
      <Ellipse cx="28" cy="32" rx="6" ry="8" fill="#f5a623"/>
      <Ellipse cx="82" cy="32" rx="6" ry="8" fill="#f5a623"/>
      {/* Eyes */}
      <Ellipse cx="44" cy="30" rx="7" ry="8" fill="white"/>
      <Ellipse cx="66" cy="30" rx="7" ry="8" fill="white"/>
      <Ellipse cx="45" cy="31" rx="4" ry="5" fill="#3a7bd5"/>
      <Ellipse cx="65" cy="31" rx="4" ry="5" fill="#3a7bd5"/>
      <Ellipse cx="45" cy="31" rx="2" ry="2.5" fill="#111"/>
      <Ellipse cx="65" cy="31" rx="2" ry="2.5" fill="#111"/>
      <Ellipse cx="46" cy="29" rx="1.5" ry="1.5" fill="white"/>
      <Ellipse cx="66" cy="29" rx="1.5" ry="1.5" fill="white"/>
      {/* Eyebrows */}
      <Path d="M37 22 Q44 18 51 21" stroke="#6b3a1f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <Path d="M59 21 Q66 18 73 22" stroke="#6b3a1f" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Nose */}
      <Ellipse cx="55" cy="37" rx="4" ry="3" fill="#e8944a"/>
      {/* Smile */}
      <Path d="M44 44 Q55 53 66 44" stroke="#c0392b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <Path d="M47 46 Q55 52 63 46" fill="white"/>
    </Svg>
  );
}

function Goalkeeper({ x, goalTop }: { x: Animated.Value; goalTop: number }) {
  const top = goalTop - GK_HEIGHT;
  return (
    <Animated.View style={{ position: 'absolute', top, left: Animated.add(x, new Animated.Value(-GK_WIDTH / 2 + GK_RADIUS)) }}>
      <GoalkeeperSvg />
    </Animated.View>
  );
}

// Simple wall player figure
function WallPlayerSvg({ shirtColor }: { shirtColor: string }) {
  return (
    <Svg width={WALL_PLAYER_W} height={WALL_PLAYER_H} viewBox="0 0 28 64">
      {/* Legs */}
      <Rect x="4" y="36" width="8" height="20" rx="4" fill="#1a1a2e"/>
      <Rect x="16" y="36" width="8" height="20" rx="4" fill="#1a1a2e"/>
      {/* Boots */}
      <Ellipse cx="8" cy="57" rx="7" ry="5" fill="#222"/>
      <Ellipse cx="20" cy="57" rx="7" ry="5" fill="#222"/>
      {/* Body */}
      <Rect x="4" y="18" width="20" height="22" rx="6" fill={shirtColor}/>
      {/* Arms crossed (hands in front of groin like real wall) */}
      <Rect x="0" y="30" width="10" height="8" rx="4" fill={shirtColor}/>
      <Rect x="18" y="30" width="10" height="8" rx="4" fill={shirtColor}/>
      {/* Neck */}
      <Rect x="11" y="12" width="6" height="8" rx="3" fill="#f5a623"/>
      {/* Head */}
      <Ellipse cx="14" cy="9" rx="9" ry="10" fill="#f5a623"/>
      {/* Eyes */}
      <Ellipse cx="10" cy="8" rx="2" ry="2" fill="white"/>
      <Ellipse cx="18" cy="8" rx="2" ry="2" fill="white"/>
      <Ellipse cx="10" cy="8" rx="1" ry="1" fill="#111"/>
      <Ellipse cx="18" cy="8" rx="1" ry="1" fill="#111"/>
      {/* Hair */}
      <Ellipse cx="14" cy="2" rx="9" ry="5" fill="#5c3317"/>
    </Svg>
  );
}

function Wall({ wallX, wallY }: { wallX: number; wallY: number }) {
  return (
    <View style={{ position: 'absolute', left: wallX - WALL_TOTAL_W / 2, top: wallY - WALL_PLAYER_H, flexDirection: 'row', gap: WALL_GAP }}>
      <WallPlayerSvg shirtColor="#cc2222" />
      <WallPlayerSvg shirtColor="#2255cc" />
    </View>
  );
}

function PitchMarkings({ width, height, goalTop }: { width: number; height: number; goalTop: number }) {
  const cx = width / 2;
  const centreY = goalTop + (height - goalTop) * 0.45;
  const circleR = Math.min(width, height) * 0.13;
  const penBoxW = GOAL_WIDTH + 60;
  const penBoxH = 90;
  const penBoxTop = goalTop - 4;

  return (
    <>
      <View style={[styles.pitchLine, { left: 12, top: goalTop - GOAL_HEIGHT - 10, width: width - 24, height: 2 }]} />
      <View style={[styles.pitchLine, { left: 12, top: height - 16, width: width - 24, height: 2 }]} />
      <View style={[styles.pitchLine, { left: 12, top: goalTop - GOAL_HEIGHT - 10, width: 2, height: height - goalTop + GOAL_HEIGHT - 6 }]} />
      <View style={[styles.pitchLine, { left: width - 14, top: goalTop - GOAL_HEIGHT - 10, width: 2, height: height - goalTop + GOAL_HEIGHT - 6 }]} />
      <View style={[styles.pitchLine, { left: 12, top: centreY, width: width - 24, height: 2 }]} />
      <View style={[styles.pitchCircle, {
        left: cx - circleR, top: centreY - circleR,
        width: circleR * 2, height: circleR * 2, borderRadius: circleR,
      }]} />
      <View style={[styles.pitchSpot, { left: cx - 4, top: centreY - 4 }]} />
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop, width: penBoxW, height: 2 }]} />
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop, width: 2, height: penBoxH }]} />
      <View style={[styles.pitchLine, { left: cx + penBoxW / 2, top: penBoxTop, width: 2, height: penBoxH }]} />
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop + penBoxH, width: penBoxW, height: 2 }]} />
      <View style={[styles.pitchSpot, { left: cx - 4, top: penBoxTop + penBoxH * 0.55 }]} />
    </>
  );
}

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();

  const phaseRef = useRef<GamePhase>('juggling');
  const [phase, setPhase] = useState<GamePhase>('juggling');
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const aimAngleRef = useRef(-Math.PI / 2);
  const [power, setPower] = useState(50);
  const powerRef = useRef(50);
  const [curveSpin, setCurveSpin] = useState(0);
  const curveSpinRef = useRef(0);
  const [score, setScore] = useState(0);
  const [trapUnlockTarget, setTrapUnlockTarget] = useState(TRAP_UNLOCK_BASE);
  const [juggleCount, setJuggleCount] = useState(0);
  const juggleCountRef = useRef(0);
  const [bestJuggles, setBestJuggles] = useState(0);
  const [message, setMessage] = useState('');
  const [celebration, setCelebration] = useState(false);
  const gkXRef = useRef(width / 2);
  const tRef = useRef(0);
  const shotResultRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [shotTimer, setShotTimer] = useState(SHOT_TIMER_SECS);
  const shotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Curve control — stepped left/right buttons
  const MAX_CURVE = 10;
  const CURVE_STEP = 1.5;
  const curveHoldRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const adjustCurve = useCallback((dir: 1 | -1) => {
    const next = Math.max(-MAX_CURVE, Math.min(MAX_CURVE, curveSpinRef.current + dir * CURVE_STEP));
    curveSpinRef.current = next;
    setCurveSpin(next);
    setSliderPos(next / MAX_CURVE);
  }, []);

  const startCurveHold = useCallback((dir: 1 | -1) => {
    adjustCurve(dir);
    curveHoldRef.current = setInterval(() => adjustCurve(dir), 150);
  }, [adjustCurve]);

  const stopCurveHold = useCallback(() => {
    if (curveHoldRef.current) { clearInterval(curveHoldRef.current); curveHoldRef.current = null; }
  }, []);

  const [sliderPos, setSliderPos] = useState(0); // -1 to 1, for visual only

  const [bootPos, setBootPos] = useState<{ x: number; y: number } | null>(null);
  const bootOpacity = useRef(new Animated.Value(0)).current;
  const showBoot = useCallback((x: number, y: number) => {
    setBootPos({ x, y });
    bootOpacity.setValue(1);
    Animated.timing(bootOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }, [bootOpacity]);

  const heightRef = useRef(height);
  heightRef.current = height;

  const ballAnimX = useRef(new Animated.Value(width / 2 - BALL_RADIUS)).current;
  const ballAnimY = useRef(new Animated.Value(height * 0.4 - BALL_RADIUS)).current;
  const gkAnim = useRef(new Animated.Value(width / 2 - GK_RADIUS)).current;
  const trapBallRef = useRef<() => void>(() => {});

  const goalTop = height * GOALKEEPER_Y_RATIO;
  const goalLeft = width / 2 - GOAL_WIDTH / 2;
  const goalRight = width / 2 + GOAL_WIDTH / 2;

  // Wall is positioned 40% of the way from ball start to goal, offset left of centre
  const ballStartY = height * 0.6;
  const wallY = goalTop + (ballStartY - goalTop) * 0.4;
  const wallX = width / 2 - 20; // slightly left of centre, shooter must curve right

  const showMessage = (msg: string, ms = 1200) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), ms);
  };

  const stopShotTimer = useCallback(() => {
    if (shotTimerRef.current) {
      clearInterval(shotTimerRef.current);
      shotTimerRef.current = null;
    }
    setShotTimer(SHOT_TIMER_SECS);
  }, []);

  const resetAfterShot = useCallback((keepJuggles = false) => {
    stopShotTimer();
    releaseBall();
    phaseRef.current = 'juggling';
    setPhase('juggling');
    if (!keepJuggles) {
      setJuggleCount(0);
      juggleCountRef.current = 0;
    }
    shotResultRef.current = false;
    setCurveSpin(0);
    curveSpinRef.current = 0;
  }, [stopShotTimer]);

  const handleUpdate = useCallback((b: BallState) => {
    ballAnimX.setValue(b.x - BALL_RADIUS);
    ballAnimY.setValue(b.y - BALL_RADIUS);
    tRef.current += 16;
    const newGkX = getGoalkeeperX(width, tRef.current);
    gkXRef.current = newGkX;
    gkAnim.setValue(newGkX - GK_RADIUS);

    if (phaseRef.current === 'shot' && !shotResultRef.current) {
      // Wall collision — tight hitbox so only direct hits are blocked
      const wallLeft = wallX - WALL_TOTAL_W / 2 + 6;
      const wallRight = wallX + WALL_TOTAL_W / 2 - 6;
      const wallTopY = wallY - WALL_PLAYER_H * 0.75;
      const wallBottomY = wallY - 8;
      if (b.x > wallLeft && b.x < wallRight && b.y > wallTopY && b.y < wallBottomY) {
        shotResultRef.current = true;
        showMessage('Blocked! 🧱', 1200);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(resetAfterShot, 1200);
        return;
      }

      const inGoalX = b.x > goalLeft + 6 && b.x < goalRight - 6;
      const inGoalY = b.y + BALL_RADIUS > goalTop - GOAL_HEIGHT && b.y - BALL_RADIUS < goalTop;
      if (inGoalX && inGoalY) {
        shotResultRef.current = true;
        const savedByGk = Math.abs(b.x - gkXRef.current) < GK_RADIUS + BALL_RADIUS + 8;
        if (savedByGk) {
          showMessage('SAVED! 🧤', 1500);
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(resetAfterShot, 1500);
        } else {
          setScore(s => s + 1);
          setTrapUnlockTarget(t => t + TRAP_UNLOCK_INCREMENT);
          setCelebration(true);
          trapBallRef.current();
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            setCelebration(false);
            resetAfterShot(true); // keep juggle count after scoring
          }, 2200);
        }
      }
    }
  }, [width, ballAnimX, ballAnimY, gkAnim, goalLeft, goalRight, goalTop, wallX, wallY, resetAfterShot]);

  const { juggle, trapBall, releaseBall, shoot, getBallPos } = usePhysics({
    width,
    height,
    onUpdate: handleUpdate,
    onGrounded: useCallback(() => {
      if (phaseRef.current === 'juggling') {
        setJuggleCount(0);
        juggleCountRef.current = 0;
      }
      if (phaseRef.current === 'shot' && !shotResultRef.current) {
        shotResultRef.current = true;
        showMessage('Miss!', 1000);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(resetAfterShot, 1000);
      }
    }, [resetAfterShot]),
  });

  trapBallRef.current = trapBall;

  const doTrap = useCallback(() => {
    if (juggleCountRef.current < trapUnlockTarget) return;
    trapBall();
    phaseRef.current = 'trapped';
    setPhase('trapped');
    // Reset curve slider
    sliderPosRef.current = 0;
    setSliderPos(0);
    curveSpinRef.current = 0;
    setCurveSpin(0);
    showMessage('Trapped! Drag to aim • use curve slider', 2500);
  }, [trapBall]);

  const startShotTimer = useCallback((onExpire: () => void) => {
    setShotTimer(SHOT_TIMER_SECS);
    if (shotTimerRef.current) clearInterval(shotTimerRef.current);
    let remaining = SHOT_TIMER_SECS;
    shotTimerRef.current = setInterval(() => {
      remaining -= 1;
      setShotTimer(remaining);
      if (remaining <= 0) {
        stopShotTimer();
        onExpire();
      }
    }, 1000);
  }, [stopShotTimer]);

  const doShoot = useCallback(() => {
    stopShotTimer();
    shotResultRef.current = false;

    const pos = getBallPos();
    const goalCentreY = goalTop - GOAL_HEIGHT / 2;
    const distToGoal = Math.abs((pos?.y ?? 0) - goalCentreY);

    let finalAngle = aimAngleRef.current;
    if (powerRef.current >= OVER_BAR_POWER_THRESHOLD && distToGoal < OVER_BAR_CLOSE_DISTANCE) {
      finalAngle = finalAngle - (Math.random() * 0.3 + 0.15);
    }

    shoot(finalAngle, powerRef.current, curveSpinRef.current);
    phaseRef.current = 'shot';
    setPhase('shot');
    resetTimerRef.current = setTimeout(() => {
      if (!shotResultRef.current) showMessage('Miss!', 1000);
      resetAfterShot();
    }, 3000);
  }, [shoot, resetAfterShot, stopShotTimer, getBallPos, goalTop]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Ignore touches in the curve block area (bottom 180px) during aiming
        if (phaseRef.current === 'aiming' || phaseRef.current === 'trapped') {
          if (evt.nativeEvent.pageY > heightRef.current - 180) return false;
        }
        return true;
      },
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (evt, gs) => {
        if (phaseRef.current === 'trapped' || phaseRef.current === 'aiming') {
          const pos = getBallPos();
          if (!pos) return;

          const dx = gs.moveX - pos.x;
          const dy = gs.moveY - pos.y;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const pwr = Math.min(100, Math.max(20, dist * 0.7));

          aimAngleRef.current = angle;
          powerRef.current = pwr;
          setAimAngle(angle);
          setPower(pwr);

          if (phaseRef.current === 'trapped') {
            phaseRef.current = 'aiming';
            setPhase('aiming');
            startShotTimer(() => {
              showMessage('Too slow! ⏱', 1000);
              resetAfterShot();
            });
          }
        }
      },

      onPanResponderRelease: (evt, gs) => {
        const isSmallMove = Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12;
        if (!isSmallMove) return;
        if (phaseRef.current === 'juggling') {
          const { locationX, locationY } = evt.nativeEvent;
          juggle(locationX, locationY);
          showBoot(locationX, locationY);
          setJuggleCount(c => {
            const next = c + 1;
            juggleCountRef.current = next;
            setBestJuggles(b => Math.max(b, next));
            return next;
          });
        } else if (phaseRef.current === 'aiming') {
          doShoot();
        }
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      stopShotTimer();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [stopShotTimer]);

  // Compute curved trajectory via physics simulation
  const aimData = (phase === 'aiming' || phase === 'trapped') ? (() => {
    const pos = getBallPos();
    if (!pos) return null;

    const speed = powerRef.current * 0.4;
    const vx = Math.cos(aimAngle) * speed;
    const vy = Math.sin(aimAngle) * speed;
    const pts = simulatePath(pos.x, pos.y, vx, vy, curveSpin, 60);

    // Find where trajectory crosses goal mid-height
    const targetY = goalTop - GOAL_HEIGHT / 2;
    let targetX = width / 2;
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1].y >= targetY && pts[i].y <= targetY) {
        const f = (targetY - pts[i - 1].y) / (pts[i].y - pts[i - 1].y);
        targetX = pts[i - 1].x + f * (pts[i].x - pts[i - 1].x);
        break;
      }
    }

    // Sample 12 dots evenly along trajectory stopping at goal top
    const filtered = pts.filter(p => p.y > goalTop - GOAL_HEIGHT);
    const step = Math.max(1, Math.floor(filtered.length / 12));
    const dots = filtered.filter((_, i) => i % step === 0).slice(0, 12).map((p, i) => ({ ...p, key: i }));

    const clear = Math.abs(targetX - gkXRef.current) > GK_RADIUS + BALL_RADIUS + 4;

    // Check if trajectory hits wall
    const wallLeft = wallX - WALL_TOTAL_W / 2 + 6;
    const wallRight = wallX + WALL_TOTAL_W / 2 - 6;
    const hitsWall = pts.some(p => p.x > wallLeft && p.x < wallRight && p.y > wallY - WALL_PLAYER_H * 0.75 && p.y < wallY - 8);

    return { dots, targetX, clear, hitsWall };
  })() : null;

  const trapUnlocked = juggleCount >= trapUnlockTarget;
  const timerDanger = shotTimer <= 3;
  const showWall = phase === 'aiming' || phase === 'trapped' || phase === 'shot';

  return (
    <View style={[styles.container, { width, height }]}>
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>

      <PitchMarkings width={width} height={height} goalTop={goalTop} />

      {/* Goal net */}
      <View style={[styles.goalNet, { left: goalLeft + 6, top: goalTop - GOAL_HEIGHT + 6, width: GOAL_WIDTH - 12, height: GOAL_HEIGHT - 6 }]} />
      {/* Goal posts */}
      <View style={[styles.goalPost, { left: goalLeft - 4, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalPost, { left: goalLeft + GOAL_WIDTH - 2, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalCrossbar, { left: goalLeft - 4, top: goalTop - GOAL_HEIGHT, width: GOAL_WIDTH + 4 }]} />

      <Goalkeeper x={gkAnim} goalTop={goalTop} />

      {/* Wall */}
      {showWall && <Wall wallX={wallX} wallY={wallY} />}

      {/* Curved aim trajectory */}
      {aimData && aimData.dots.map(d => (
        <View
          key={d.key}
          style={[
            styles.aimDot,
            { left: d.x - 4, top: d.y - 4 },
            aimData.hitsWall && { backgroundColor: 'rgba(255,80,80,0.85)' },
          ]}
        />
      ))}

      {/* Goal target marker */}
      {aimData && (
        <View style={[
          styles.goalMarker,
          { left: aimData.targetX - 8, top: goalTop - GOAL_HEIGHT / 2 - 8 },
          { backgroundColor: aimData.hitsWall ? '#ff8800' : aimData.clear ? '#00ff88' : '#ff4444' },
        ]} />
      )}

      {/* Boot animation */}
      {bootPos && (
        <Animated.View style={[styles.boot, { left: bootPos.x - 22, top: bootPos.y - 18, opacity: bootOpacity }]}>
          <View style={styles.bootHeel} />
          <View style={styles.bootToe} />
        </Animated.View>
      )}

      <SoccerBall x={ballAnimX} y={ballAnimY} />

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudPill}>
          <Text style={styles.hudText}>⚽ {juggleCount}/{trapUnlockTarget}</Text>
          <Text style={styles.hudSubText}>Best: {bestJuggles}</Text>
        </View>
        <View style={styles.hudPill}>
          <Text style={styles.hudText}>Goals: {score}</Text>
        </View>
      </View>

      {/* Shot timer */}
      {phase === 'aiming' && (
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, timerDanger && styles.timerTextDanger]}>{shotTimer}s</Text>
        </View>
      )}

      {/* Trap button */}
      {phase === 'juggling' && (
        <TouchableOpacity
          style={[styles.trapBtn, trapUnlocked ? styles.trapBtnActive : styles.trapBtnLocked]}
          onPress={doTrap}
          disabled={!trapUnlocked}
        >
          <Text style={styles.trapBtnText}>
            {trapUnlocked ? 'TRAP' : `TRAP\n${juggleCount}/${trapUnlockTarget}`}
          </Text>
        </TouchableOpacity>
      )}

      {phase === 'aiming' && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Power: {Math.round(power)}%  •  Tap to shoot</Text>
        </View>
      )}

      {!!message && !celebration && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {celebration && (
        <View style={styles.celebrationOverlay}>
          <Text style={styles.celebrationTrophy}>🏆</Text>
          <Text style={styles.celebrationText}>GOAL!</Text>
          <Text style={styles.celebrationSub}>Score: {score}</Text>
        </View>
      )}

      {phase === 'juggling' && juggleCount === 0 && (
        <View style={styles.instructions}>
          <Text style={styles.instructText}>Tap near the ball to juggle</Text>
          <Text style={styles.instructText}>Get 5 juggles to unlock TRAP</Text>
        </View>
      )}
    </View>

      {/* Curve control — outside pan responder so it doesn't affect aim */}
      {(phase === 'aiming' || phase === 'trapped') && (
        <View style={styles.curveBlock}>
          <TouchableOpacity
            style={styles.curveArrowBtn}
            onPressIn={() => startCurveHold(1)}
            onPressOut={stopCurveHold}
          >
            <Text style={styles.curveArrowText}>◀</Text>
          </TouchableOpacity>
          <View style={styles.curveLabelBox}>
            <Text style={styles.curveLabelTitle}>CURVE</Text>
            <Text style={styles.curveLabelValue}>
              {Math.abs(sliderPos) < 0.05 ? 'Straight' : sliderPos > 0 ? `Left ${Math.round(Math.abs(sliderPos) * 100)}%` : `Right ${Math.round(Math.abs(sliderPos) * 100)}%`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.curveArrowBtn}
            onPressIn={() => startCurveHold(-1)}
            onPressOut={stopCurveHold}
          >
            <Text style={styles.curveArrowText}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a6b3c', overflow: 'hidden' },

  pitchLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.18)' },
  pitchCircle: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'transparent' },
  pitchSpot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' },

  ball: { position: 'absolute', width: BALL_RADIUS * 2, height: BALL_RADIUS * 2 },

  goalPost: { position: 'absolute', width: 6, backgroundColor: 'white' },
  goalCrossbar: { position: 'absolute', height: 6, backgroundColor: 'white' },
  goalNet: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  aimDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,100,0.75)' },
  goalMarker: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'white' },

  boot: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
  bootHeel: { width: 16, height: 22, backgroundColor: '#8B4513', borderRadius: 4, borderWidth: 1, borderColor: '#5a2d0c' },
  bootToe: { width: 26, height: 16, backgroundColor: '#8B4513', borderRadius: 6, borderWidth: 1, borderColor: '#5a2d0c', marginLeft: 1 },

  trapBtn: { position: 'absolute', bottom: 40, left: 20, width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  trapBtnActive: { backgroundColor: '#00cc55', borderColor: '#00ff88' },
  trapBtnLocked: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.3)' },
  trapBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },

  timerBadge: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  timerText: { color: 'rgba(255,255,255,0.85)', fontSize: 40, fontWeight: 'bold' },
  timerTextDanger: { color: '#ff4444' },

  curveBlock: { position: 'absolute', bottom: 120, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 0 },
  curveArrowBtn: { width: 52, height: 52, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  curveArrowText: { color: 'white', fontSize: 22 },
  curveLabelBox: { width: 120, height: 52, backgroundColor: 'rgba(0,0,0,0.45)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  curveLabelTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  curveLabelValue: { color: '#00eeff', fontSize: 14, fontWeight: 'bold' },

  hud: { position: 'absolute', top: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  hudPill: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  hudText: { color: '#FFD700', fontSize: 14, fontWeight: 'bold' },
  hudSubText: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  hint: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'yellow', fontSize: 16, fontWeight: '600' },
  messageBanner: { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  messageText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  celebrationOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  celebrationTrophy: { fontSize: 80 },
  celebrationText: { color: '#FFD700', fontSize: 72, fontWeight: 'bold', letterSpacing: 4 },
  celebrationSub: { color: 'white', fontSize: 28, marginTop: 8 },
  instructions: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', gap: 6 },
  instructText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
});
