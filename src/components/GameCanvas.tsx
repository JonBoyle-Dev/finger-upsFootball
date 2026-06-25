import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePhysics, BallState, BALL_RADIUS } from '../hooks/usePhysics';

type GamePhase = 'juggling' | 'trapped' | 'aiming' | 'shot';

const GOALKEEPER_Y_RATIO = 0.2;
const GOAL_WIDTH = 220;
const GOAL_HEIGHT = 100;
const GK_RADIUS = 18;
const TRAP_UNLOCK = 5;

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 35);
}

const BALL_PATCHES = [
  { x: 0, y: -8 },
  { x: 8, y: 4 },
  { x: -8, y: 4 },
];

function SoccerBall({ x, y }: { x: Animated.Value; y: Animated.Value }) {
  return (
    <Animated.View style={[styles.ball, { left: x, top: y }]}>
      {BALL_PATCHES.map((p, i) => (
        <View key={i} style={[styles.ballPatch, { left: BALL_RADIUS + p.x - 7, top: BALL_RADIUS + p.y - 7 }]} />
      ))}
    </Animated.View>
  );
}

function Goalkeeper({ x, goalTop }: { x: Animated.Value; goalTop: number }) {
  const headTop = goalTop - GOAL_HEIGHT + 6;
  return (
    <>
      <Animated.View style={[styles.gkArm, { top: headTop + GK_RADIUS * 2 + 4, left: Animated.add(x, new Animated.Value(-22)) }]} />
      <Animated.View style={[styles.gkArm, { top: headTop + GK_RADIUS * 2 + 4, left: Animated.add(x, new Animated.Value(GK_RADIUS * 2 + 2)) }]} />
      <Animated.View style={[styles.gkBody, { top: headTop + GK_RADIUS * 2, left: Animated.add(x, new Animated.Value(GK_RADIUS - 12)) }]} />
      <Animated.View style={[styles.gkLeg, { top: headTop + GK_RADIUS * 2 + 36, left: Animated.add(x, new Animated.Value(GK_RADIUS - 14)) }]} />
      <Animated.View style={[styles.gkLeg, { top: headTop + GK_RADIUS * 2 + 36, left: Animated.add(x, new Animated.Value(GK_RADIUS + 4)) }]} />
      <Animated.View style={[styles.gkHead, { top: headTop, left: x }]}>
        <View style={styles.gkEyeLeft} />
        <View style={styles.gkEyeRight} />
        <View style={styles.gkMouth} />
      </Animated.View>
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
  const [score, setScore] = useState(0);
  const [juggleCount, setJuggleCount] = useState(0);
  const juggleCountRef = useRef(0);
  const [bestJuggles, setBestJuggles] = useState(0);
  const [message, setMessage] = useState('');
  const [celebration, setCelebration] = useState(false);
  const gkXRef = useRef(width / 2);
  const tRef = useRef(0);
  const shotResultRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Boot animation
  const [bootPos, setBootPos] = useState<{ x: number; y: number } | null>(null);
  const bootOpacity = useRef(new Animated.Value(0)).current;
  const showBoot = useCallback((x: number, y: number) => {
    setBootPos({ x, y });
    bootOpacity.setValue(1);
    Animated.timing(bootOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }, [bootOpacity]);

  const ballAnimX = useRef(new Animated.Value(width / 2 - BALL_RADIUS)).current;
  const ballAnimY = useRef(new Animated.Value(height * 0.4 - BALL_RADIUS)).current;
  const gkAnim = useRef(new Animated.Value(width / 2 - GK_RADIUS)).current;
  const trapBallRef = useRef<() => void>(() => {});

  const goalTop = height * GOALKEEPER_Y_RATIO;
  const goalLeft = width / 2 - GOAL_WIDTH / 2;
  const goalRight = width / 2 + GOAL_WIDTH / 2;

  const showMessage = (msg: string, ms = 1200) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), ms);
  };

  const resetAfterShot = useCallback(() => {
    releaseBall();
    phaseRef.current = 'juggling';
    setPhase('juggling');
    setJuggleCount(0);
    juggleCountRef.current = 0;
    shotResultRef.current = false;
  }, []);

  const handleUpdate = useCallback((b: BallState) => {
    ballAnimX.setValue(b.x - BALL_RADIUS);
    ballAnimY.setValue(b.y - BALL_RADIUS);
    tRef.current += 16;
    const newGkX = getGoalkeeperX(width, tRef.current);
    gkXRef.current = newGkX;
    gkAnim.setValue(newGkX - GK_RADIUS);

    if (phaseRef.current === 'shot' && !shotResultRef.current) {
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
          setCelebration(true);
          trapBallRef.current();
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
          resetTimerRef.current = setTimeout(() => {
            setCelebration(false);
            resetAfterShot();
          }, 2200);
        }
      }
    }
  }, [width, ballAnimX, ballAnimY, gkAnim, goalLeft, goalRight, goalTop, resetAfterShot]);

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
    if (juggleCountRef.current < TRAP_UNLOCK) return;
    trapBall();
    phaseRef.current = 'trapped';
    setPhase('trapped');
    showMessage('Trapped! Drag to aim', 2000);
  }, [trapBall]);

  const doShoot = useCallback(() => {
    shotResultRef.current = false;
    shoot(aimAngleRef.current, powerRef.current, 0);
    phaseRef.current = 'shot';
    setPhase('shot');
    resetTimerRef.current = setTimeout(() => {
      if (!shotResultRef.current) showMessage('Miss!', 1000);
      resetAfterShot();
    }, 3000);
  }, [shoot, resetAfterShot]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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
          phaseRef.current = 'aiming';
          setPhase('aiming');
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

  // Compute full aim arc from ball to goal
  const aimData = (phase === 'aiming' || phase === 'trapped') ? (() => {
    const pos = getBallPos();
    if (!pos) return { dots: [], targetX: width / 2, clear: true };

    const dx = Math.cos(aimAngle);
    const dy = Math.sin(aimAngle);
    // Intersect straight line with goal mouth midpoint
    const targetY = goalTop - GOAL_HEIGHT / 2;
    const t = dy !== 0 ? (targetY - pos.y) / dy : 300;
    const rawX = pos.x + dx * t;
    const targetX = Math.max(goalLeft + 10, Math.min(goalRight - 10, rawX));
    const NUM_DOTS = 10;
    const dots = Array.from({ length: NUM_DOTS }, (_, i) => {
      const f = (i + 1) / (NUM_DOTS + 1);
      return { x: pos.x + (targetX - pos.x) * f, y: pos.y + (targetY - pos.y) * f, key: i };
    });
    const clear = Math.abs(targetX - gkXRef.current) > GK_RADIUS + BALL_RADIUS + 4;
    return { dots, targetX, clear, hitGoal: true };
  })() : null;

  const trapUnlocked = juggleCount >= TRAP_UNLOCK;

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers}>

      {/* Goal net */}
      <View style={[styles.goalNet, { left: goalLeft + 6, top: goalTop - GOAL_HEIGHT + 6, width: GOAL_WIDTH - 12, height: GOAL_HEIGHT - 6 }]} />
      {/* Goal posts */}
      <View style={[styles.goalPost, { left: goalLeft - 4, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalPost, { left: goalLeft + GOAL_WIDTH - 2, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalCrossbar, { left: goalLeft - 4, top: goalTop - GOAL_HEIGHT, width: GOAL_WIDTH + 4 }]} />

      {/* Goalkeeper */}
      <Goalkeeper x={gkAnim} goalTop={goalTop} />

      {/* Aim trajectory */}
      {aimData && aimData.dots.map(d => (
        <View key={d.key} style={[styles.aimDot, { left: d.x - 4, top: d.y - 4 }]} />
      ))}

      {/* Goal target marker */}
      {aimData && (
        <View style={[
          styles.goalMarker,
          { left: aimData.targetX - 8, top: goalTop - GOAL_HEIGHT / 2 - 8 },
          { backgroundColor: aimData.clear ? '#00ff88' : '#ff4444' },
        ]} />
      )}

      {/* Boot animation */}
      {bootPos && (
        <Animated.View style={[styles.boot, { left: bootPos.x - 22, top: bootPos.y - 18, opacity: bootOpacity }]}>
          <View style={styles.bootHeel} />
          <View style={styles.bootToe} />
        </Animated.View>
      )}

      {/* Soccer ball */}
      <SoccerBall x={ballAnimX} y={ballAnimY} />

      {/* HUD */}
      <View style={styles.hud}>
        <View>
          <Text style={styles.hudText}>Juggles: {juggleCount}</Text>
          <Text style={styles.hudSubText}>Best: {bestJuggles}</Text>
        </View>
        <Text style={styles.hudText}>Goals: {score}</Text>
      </View>

      {/* Trap button */}
      {phase === 'juggling' && (
        <TouchableOpacity
          style={[styles.trapBtn, trapUnlocked ? styles.trapBtnActive : styles.trapBtnLocked]}
          onPress={doTrap}
          disabled={!trapUnlocked}
        >
          <Text style={styles.trapBtnText}>
            {trapUnlocked ? 'TRAP' : `TRAP\n${juggleCount}/${TRAP_UNLOCK}`}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a6b3c', overflow: 'hidden' },

  ball: {
    position: 'absolute',
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#222',
  },
  ballPatch: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#222',
  },

  // Goalkeeper
  gkHead: {
    position: 'absolute',
    width: GK_RADIUS * 2,
    height: GK_RADIUS * 2,
    borderRadius: GK_RADIUS,
    backgroundColor: '#f5c842',
    borderWidth: 2,
    borderColor: '#333',
  },
  gkEyeLeft: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#333', left: 7, top: 10 },
  gkEyeRight: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#333', right: 7, top: 10 },
  gkMouth: { position: 'absolute', width: 10, height: 4, borderRadius: 2, backgroundColor: '#c0392b', bottom: 8, left: 9 },
  gkBody: { position: 'absolute', width: 24, height: 36, borderRadius: 4, backgroundColor: '#cc3333', borderWidth: 1, borderColor: '#333' },
  gkArm: { position: 'absolute', width: 20, height: 10, borderRadius: 5, backgroundColor: '#f5c842', borderWidth: 1, borderColor: '#333' },
  gkLeg: { position: 'absolute', width: 10, height: 28, borderRadius: 4, backgroundColor: '#2255cc', borderWidth: 1, borderColor: '#333' },

  // Goal
  goalPost: { position: 'absolute', width: 6, backgroundColor: 'white' },
  goalCrossbar: { position: 'absolute', height: 6, backgroundColor: 'white' },
  goalNet: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },

  // Aim
  aimDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,100,0.75)' },
  goalMarker: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'white' },

  // Boot
  boot: { position: 'absolute', flexDirection: 'row', alignItems: 'flex-end' },
  bootHeel: { width: 16, height: 22, backgroundColor: '#8B4513', borderRadius: 4, borderWidth: 1, borderColor: '#5a2d0c' },
  bootToe: { width: 26, height: 16, backgroundColor: '#8B4513', borderRadius: 6, borderWidth: 1, borderColor: '#5a2d0c', marginLeft: 1 },

  // Trap button
  trapBtn: { position: 'absolute', bottom: 40, left: 20, width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  trapBtnActive: { backgroundColor: '#00cc55', borderColor: '#00ff88' },
  trapBtnLocked: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.3)' },
  trapBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },

  // HUD
  hud: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  hudText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hudSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
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
