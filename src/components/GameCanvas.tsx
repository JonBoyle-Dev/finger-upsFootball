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

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 30);
}

export default function GameCanvas() {
  const { width, height } = useWindowDimensions();

  const [ball, setBall] = useState<BallState>({ x: width / 2, y: height * 0.4, vx: 0, vy: 0, spin: 0 });
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
  const lastTwoFingerTap = useRef(0);

  const ballAnim = useRef(new Animated.ValueXY({ x: width / 2 - BALL_RADIUS, y: height * 0.4 - BALL_RADIUS })).current;
  const gkAnim = useRef(new Animated.Value(width / 2 - GK_RADIUS)).current;

  const handleUpdate = useCallback((b: BallState) => {
    setBall(b);
    ballAnim.setValue({ x: b.x - BALL_RADIUS, y: b.y - BALL_RADIUS });
    tRef.current += 16;
    const newGkX = getGoalkeeperX(width, tRef.current);
    gkXRef.current = newGkX;
    gkAnim.setValue(newGkX - GK_RADIUS);
  }, [width, ballAnim, gkAnim]);

  const { juggle, trapBall, releaseBall, shoot, getBallPos } = usePhysics({
    width,
    height,
    onUpdate: handleUpdate,
  });

  const showMessage = (msg: string, ms = 1200) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), ms);
  };

  const doShoot = useCallback(() => {
    shoot(aimAngleRef.current, powerRef.current, 0);
    phaseRef.current = 'shot';
    setPhase('shot');
    setTimeout(() => {
      const p = getBallPos();
      if (p) {
        const goalTop = height * GOALKEEPER_Y_RATIO;
        const goalLeft = width / 2 - GOAL_WIDTH / 2;
        const goalRight = width / 2 + GOAL_WIDTH / 2;
        const inGoalX = p.x > goalLeft && p.x < goalRight;
        const inGoalY = p.y < goalTop && p.y > goalTop - GOAL_HEIGHT;
        const savedByGk = Math.abs(p.x - gkXRef.current) < 40;
        if (inGoalX && inGoalY && !savedByGk) {
          setScore(s => s + 1);
          showMessage('GOAL!', 1500);
        } else if (inGoalX && inGoalY && savedByGk) {
          showMessage('SAVED!', 1500);
        } else {
          showMessage('Miss!', 1000);
        }
      }
      releaseBall();
      phaseRef.current = 'juggling';
      setPhase('juggling');
      setJuggleCount(0);
    }, 1400);
  }, [shoot, getBallPos, releaseBall, height, width]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        if (touches.length >= 2) {
          const now = Date.now();
          if (now - lastTwoFingerTap.current < 350 && phaseRef.current === 'juggling') {
            trapBall();
            phaseRef.current = 'trapped';
            setPhase('trapped');
            showMessage('Trapped! Drag to aim', 2000);
          }
          lastTwoFingerTap.current = now;
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
          setJuggleCount(c => c + 1);
        } else if (phaseRef.current === 'aiming') {
          doShoot();
        }
      },
    })
  ).current;

  const goalTop = height * GOALKEEPER_Y_RATIO;
  const goalLeft = width / 2 - GOAL_WIDTH / 2;

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
      <View style={[styles.goalPost, { left: goalLeft - 3, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalPost, { left: goalLeft + GOAL_WIDTH - 3, top: goalTop - GOAL_HEIGHT, height: GOAL_HEIGHT }]} />
      <View style={[styles.goalCrossbar, { left: goalLeft, top: goalTop - GOAL_HEIGHT, width: GOAL_WIDTH }]} />
      <View style={[styles.goalNet, { left: goalLeft + 5, top: goalTop - GOAL_HEIGHT + 5, width: GOAL_WIDTH - 10, height: GOAL_HEIGHT - 5 }]} />

      <Animated.View style={[styles.goalkeeper, { top: goalTop - GOAL_HEIGHT / 2 - GK_RADIUS, left: gkAnim }]} />

      {aimDots.map(d => (
        <View key={d.key} style={[styles.aimDot, { left: d.x - 4, top: d.y - 4 }]} />
      ))}

      <Animated.View style={[styles.ball, { left: ballAnim.x, top: ballAnim.y }]} />

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
          <Text style={styles.instructText}>Two-finger double-tap to trap</Text>
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
    backgroundColor: '#e8b84b',
    borderWidth: 3,
    borderColor: '#cc3333',
  },
  goalPost: { position: 'absolute', width: 6, backgroundColor: 'white' },
  goalCrossbar: { position: 'absolute', height: 6, backgroundColor: 'white' },
  goalNet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
