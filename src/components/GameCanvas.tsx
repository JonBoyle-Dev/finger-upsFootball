import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { usePhysics, BallState, BALL_RADIUS } from '../hooks/usePhysics';

type GamePhase = 'juggling' | 'trapped' | 'aiming' | 'shot';

const GOALKEEPER_Y_RATIO = 0.2;
const GOAL_WIDTH = 220;
const GOAL_HEIGHT = 100;
const GK_RADIUS = 18;

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 35);
}

// Soccer ball patches (simplified hexagon positions)
const BALL_PATCHES = [
  { x: 0, y: -8 },
  { x: 8, y: 4 },
  { x: -8, y: 4 },
];

function SoccerBall({ x, y }: { x: Animated.Value; y: Animated.Value }) {
  const d = BALL_RADIUS * 2;
  return (
    <Animated.View style={[styles.ball, { left: x, top: y }]}>
      {BALL_PATCHES.map((p, i) => (
        <View key={i} style={[styles.ballPatch, { left: BALL_RADIUS + p.x - 7, top: BALL_RADIUS + p.y - 7 }]} />
      ))}
    </Animated.View>
  );
}

function Goalkeeper({ x, goalTop }: { x: Animated.Value; goalTop: number }) {
  // Position goalkeeper so full body sits inside the goal
  const headTop = goalTop - GOAL_HEIGHT + 6;
  return (
    <>
      {/* Left arm */}
      <Animated.View style={[styles.gkArm, { top: headTop + GK_RADIUS * 2 + 4, left: Animated.add(x, new Animated.Value(-22)) }]} />
      {/* Right arm */}
      <Animated.View style={[styles.gkArm, { top: headTop + GK_RADIUS * 2 + 4, left: Animated.add(x, new Animated.Value(GK_RADIUS * 2 + 2)) }]} />
      {/* Body */}
      <Animated.View style={[styles.gkBody, { top: headTop + GK_RADIUS * 2, left: Animated.add(x, new Animated.Value(GK_RADIUS - 12)) }]} />
      {/* Left leg */}
      <Animated.View style={[styles.gkLeg, { top: headTop + GK_RADIUS * 2 + 36, left: Animated.add(x, new Animated.Value(GK_RADIUS - 14)) }]} />
      {/* Right leg */}
      <Animated.View style={[styles.gkLeg, { top: headTop + GK_RADIUS * 2 + 36, left: Animated.add(x, new Animated.Value(GK_RADIUS + 4)) }]} />
      {/* Head */}
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
  const [bestJuggles, setBestJuggles] = useState(0);
  const [message, setMessage] = useState('');
  const gkXRef = useRef(width / 2);
  const tRef = useRef(0);
  const shotResultRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leg kick animation
  const [legPos, setLegPos] = useState<{ x: number; y: number } | null>(null);
  const legOpacity = useRef(new Animated.Value(0)).current;
  const showLeg = useCallback((x: number, y: number) => {
    setLegPos({ x, y });
    legOpacity.setValue(1);
    Animated.timing(legOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
  }, [legOpacity]);

  const ballAnimX = useRef(new Animated.Value(width / 2 - BALL_RADIUS)).current;
  const ballAnimY = useRef(new Animated.Value(height * 0.4 - BALL_RADIUS)).current;
  const gkAnim = useRef(new Animated.Value(width / 2 - GK_RADIUS)).current;

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
        } else {
          setScore(s => s + 1);
          showMessage('GOAL! ⚽', 1500);
        }
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(resetAfterShot, 1500);
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
      }
      if (phaseRef.current === 'shot' && !shotResultRef.current) {
        shotResultRef.current = true;
        showMessage('Miss!', 1000);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(resetAfterShot, 1000);
      }
    }, [resetAfterShot]),
  });

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

      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        if (touches.length >= 2 && phaseRef.current === 'juggling') {
          trapBall();
          phaseRef.current = 'trapped';
          setPhase('trapped');
          showMessage('Trapped! Drag to aim', 2000);
        }
      },

      onPanResponderMove: (evt, gs) => {
        if (phaseRef.current === 'trapped' || phaseRef.current === 'aiming') {
          const pos = getBallPos();
          if (!pos) return;
          const dx = gs.moveX - pos.x;
          const dy = gs.moveY - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
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
          showLeg(locationX, locationY);
          setJuggleCount(c => {
            const next = c + 1;
            setBestJuggles(b => Math.max(b, next));
            return next;
          });
        } else if (phaseRef.current === 'aiming') {
          doShoot();
        }
      },
    })
  ).current;

  const aimDots = phase === 'aiming' ? (() => {
    const pos = getBallPos();
    if (!pos) return [];
    return Array.from({ length: 8 }, (_, i) => {
      const frac = (i + 1) / 8;
      const t = frac * 0.8;
      return {
        x: pos.x + Math.cos(aimAngle) * power * frac * 1.8,
        y: pos.y + Math.sin(aimAngle) * power * frac * 1.8 + 0.5 * 9.8 * t * t * 18,
        key: i,
      };
    });
  })() : [];

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

      {/* Aim dots */}
      {aimDots.map(d => (
        <View key={d.key} style={[styles.aimDot, { left: d.x - 4, top: d.y - 4 }]} />
      ))}

      {/* Leg kick */}
      {legPos && (
        <Animated.View style={[styles.leg, { left: legPos.x - 18, top: legPos.y - 40, opacity: legOpacity }]}>
          <View style={styles.legUpper} />
          <View style={styles.legLower} />
          <View style={styles.legBoot} />
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

      {phase === 'aiming' && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Power: {Math.round(power)}%  •  Tap to shoot</Text>
        </View>
      )}

      {!!message && (
        <View style={styles.messageBanner}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {phase === 'juggling' && juggleCount === 0 && (
        <View style={styles.instructions}>
          <Text style={styles.instructText}>Tap near the ball to juggle</Text>
          <Text style={styles.instructText}>Two fingers to trap • drag to aim • tap to shoot</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a6b3c', overflow: 'hidden' },

  // Soccer ball
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  gkEyeLeft: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#333', left: 7, top: 10 },
  gkEyeRight: { position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: '#333', right: 7, top: 10 },
  gkMouth: { position: 'absolute', width: 10, height: 4, borderRadius: 2, backgroundColor: '#c0392b', bottom: 8 },
  gkBody: {
    position: 'absolute',
    width: 24,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#cc3333',
    borderWidth: 1,
    borderColor: '#333',
  },
  gkArm: {
    position: 'absolute',
    width: 20,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f5c842',
    borderWidth: 1,
    borderColor: '#333',
  },
  gkLeg: {
    position: 'absolute',
    width: 10,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#2255cc',
    borderWidth: 1,
    borderColor: '#333',
  },

  // Goal
  goalPost: { position: 'absolute', width: 6, backgroundColor: 'white' },
  goalCrossbar: { position: 'absolute', height: 6, backgroundColor: 'white' },
  goalNet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Aim
  aimDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,100,0.7)' },

  // Leg
  leg: { position: 'absolute', alignItems: 'center' },
  legUpper: { width: 10, height: 18, backgroundColor: '#fff', borderRadius: 4 },
  legLower: { width: 10, height: 16, backgroundColor: '#f5c842', borderRadius: 4, marginTop: 1 },
  legBoot: { width: 18, height: 10, backgroundColor: '#222', borderRadius: 4, marginTop: 1, marginLeft: 4 },

  // HUD
  hud: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  hudText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hudSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  hint: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'yellow', fontSize: 16, fontWeight: '600' },
  messageBanner: { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  messageText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  instructions: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', gap: 6 },
  instructText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
});
