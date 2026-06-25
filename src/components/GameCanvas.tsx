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

const GOALKEEPER_Y_RATIO = 0.18;
const GOAL_WIDTH = 200;
const GOAL_HEIGHT = 90;
const GK_RADIUS = 22;
const GK_BODY_HEIGHT = 50;

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 30);
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
  const [message, setMessage] = useState('');
  const gkXRef = useRef(width / 2);
  const tRef = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shotResultRef = useRef(false); // prevent multiple goal triggers
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ballAnim = useRef(new Animated.ValueXY({ x: width / 2 - BALL_RADIUS, y: height * 0.4 - BALL_RADIUS })).current;
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
    ballAnim.setValue({ x: b.x - BALL_RADIUS, y: b.y - BALL_RADIUS });
    tRef.current += 16;
    const newGkX = getGoalkeeperX(width, tRef.current);
    gkXRef.current = newGkX;
    gkAnim.setValue(newGkX - GK_RADIUS);

    // Continuous goal detection during shot
    if (phaseRef.current === 'shot' && !shotResultRef.current) {
      const inGoalX = b.x > goalLeft && b.x < goalRight;
      const inGoalY = b.y < goalTop && b.y > goalTop - GOAL_HEIGHT;
      if (inGoalX && inGoalY) {
        shotResultRef.current = true;
        const savedByGk = Math.abs(b.x - gkXRef.current) < 45;
        if (savedByGk) {
          showMessage('SAVED!', 1500);
        } else {
          setScore(s => s + 1);
          showMessage('GOAL!', 1500);
        }
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(resetAfterShot, 1500);
      }
    }
  }, [width, ballAnim, gkAnim, goalLeft, goalRight, goalTop, resetAfterShot]);

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
    // Fallback reset if ball never reaches goal
    resetTimerRef.current = setTimeout(() => {
      if (!shotResultRef.current) showMessage('Miss!', 1000);
      resetAfterShot();
    }, 3000);
  }, [shoot, resetAfterShot]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        if (phaseRef.current === 'juggling') {
          longPressTimer.current = setTimeout(() => {
            trapBall();
            phaseRef.current = 'trapped';
            setPhase('trapped');
            showMessage('Trapped! Drag to aim', 2000);
          }, 500);
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
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        const isSmallMove = Math.abs(gs.dx) < 12 && Math.abs(gs.dy) < 12;
        if (!isSmallMove) return;

        if (phaseRef.current === 'juggling') {
          const { locationX, locationY } = evt.nativeEvent;
          juggle(locationX, locationY);
          setJuggleCount(c => c + 1);
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
      <View style={[styles.goalNet, { left: goalLeft + 5, top: goalTop - GOAL_HEIGHT + 5, width: GOAL_WIDTH - 10, height: GOAL_HEIGHT - 5 }]} />
      {/* Goal posts */}
      <View style={[styles.goalPost, { left: goalLeft - 3, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalPost, { left: goalLeft + GOAL_WIDTH - 3, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalCrossbar, { left: goalLeft, top: goalTop - GOAL_HEIGHT, width: GOAL_WIDTH }]} />

      {/* Goalkeeper body */}
      <Animated.View style={[styles.gkBody, { top: goalTop - GOAL_HEIGHT / 2 - GK_RADIUS + GK_RADIUS * 2, left: Animated.add(gkAnim, new Animated.Value(GK_RADIUS - 14)) }]} />
      {/* Goalkeeper head */}
      <Animated.View style={[styles.goalkeeper, { top: goalTop - GOAL_HEIGHT / 2 - GK_RADIUS, left: gkAnim }]} />

      {/* Aim dots */}
      {aimDots.map(d => (
        <View key={d.key} style={[styles.aimDot, { left: d.x - 4, top: d.y - 4 }]} />
      ))}

      {/* Ball */}
      <Animated.View style={[styles.ball, { left: ballAnim.x, top: ballAnim.y }]} />

      {/* HUD */}
      <View style={styles.hud}>
        <Text style={styles.hudText}>Juggles: {juggleCount}</Text>
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
          <Text style={styles.instructText}>Hold to trap, drag to aim, tap to shoot</Text>
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
    backgroundColor: '#f5a623',
    borderWidth: 2,
    borderColor: '#c8861a',
  },
  goalkeeper: {
    position: 'absolute',
    width: GK_RADIUS * 2,
    height: GK_RADIUS * 2,
    borderRadius: GK_RADIUS,
    backgroundColor: '#f5c842',
    borderWidth: 2,
    borderColor: '#333',
  },
  gkBody: {
    position: 'absolute',
    width: 28,
    height: GK_BODY_HEIGHT,
    borderRadius: 6,
    backgroundColor: '#cc3333',
    borderWidth: 2,
    borderColor: '#333',
  },
  goalPost: { position: 'absolute', width: 6, backgroundColor: 'white' },
  goalCrossbar: { position: 'absolute', height: 6, backgroundColor: 'white' },
  goalNet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  aimDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,100,0.7)',
  },
  hud: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  hudText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  hint: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'yellow', fontSize: 16, fontWeight: '600' },
  messageBanner: { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  messageText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  instructions: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', gap: 6 },
  instructText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
