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
  Circle,
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
const TRAP_UNLOCK = 5;
const SHOT_TIMER_SECS = 10;

// Power threshold above which a close-range shot can go over
const OVER_BAR_POWER_THRESHOLD = 75;
const OVER_BAR_CLOSE_DISTANCE = 180;

function getGoalkeeperX(width: number, t: number): number {
  return width / 2 + Math.sin(t * 0.001) * (GOAL_WIDTH / 2 - 35);
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
      {/* Left glove */}
      <Ellipse cx="8" cy="71" rx="14" ry="12" fill="#2d2d3a"/>
      <Rect x="0" y="58" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="10" y="55" width="9" height="16" rx="4" fill="#2d2d3a"/>
      <Rect x="20" y="57" width="9" height="14" rx="4" fill="#2d2d3a"/>
      {/* Right arm */}
      <Rect x="82" y="62" width="28" height="18" rx="9" fill="#f5c800"/>
      {/* Right glove */}
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

function PitchMarkings({ width, height, goalTop }: { width: number; height: number; goalTop: number }) {
  const cx = width / 2;
  // Place centre line and circle in the lower half of the pitch
  const centreY = goalTop + (height - goalTop) * 0.45;
  const circleR = Math.min(width, height) * 0.13;
  const penBoxW = GOAL_WIDTH + 60;
  const penBoxH = 90;
  const penBoxTop = goalTop - 4;

  return (
    <>
      {/* Outer pitch border */}
      <View style={[styles.pitchLine, { left: 12, top: goalTop - GOAL_HEIGHT - 10, width: width - 24, height: 2 }]} />
      <View style={[styles.pitchLine, { left: 12, top: height - 16, width: width - 24, height: 2 }]} />
      <View style={[styles.pitchLine, { left: 12, top: goalTop - GOAL_HEIGHT - 10, width: 2, height: height - goalTop + GOAL_HEIGHT - 6 }]} />
      <View style={[styles.pitchLine, { left: width - 14, top: goalTop - GOAL_HEIGHT - 10, width: 2, height: height - goalTop + GOAL_HEIGHT - 6 }]} />

      {/* Centre line */}
      <View style={[styles.pitchLine, { left: 12, top: centreY, width: width - 24, height: 2 }]} />

      {/* Centre circle (drawn as a ring using borderRadius) */}
      <View style={[styles.pitchCircle, {
        left: cx - circleR,
        top: centreY - circleR,
        width: circleR * 2,
        height: circleR * 2,
        borderRadius: circleR,
      }]} />
      {/* Centre spot */}
      <View style={[styles.pitchSpot, { left: cx - 4, top: centreY - 4 }]} />

      {/* Penalty box (top — around goal) */}
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop, width: penBoxW, height: 2 }]} />
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop, width: 2, height: penBoxH }]} />
      <View style={[styles.pitchLine, { left: cx + penBoxW / 2, top: penBoxTop, width: 2, height: penBoxH }]} />
      <View style={[styles.pitchLine, { left: cx - penBoxW / 2, top: penBoxTop + penBoxH, width: penBoxW, height: 2 }]} />

      {/* Penalty spot */}
      <View style={[styles.pitchSpot, { left: cx - 4, top: penBoxTop + penBoxH + 20 }]} />
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

  // Shot timer
  const [shotTimer, setShotTimer] = useState(SHOT_TIMER_SECS);
  const shotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Curve spin from touch offset
  const touchOffsetXRef = useRef(0);

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

  const stopShotTimer = useCallback(() => {
    if (shotTimerRef.current) {
      clearInterval(shotTimerRef.current);
      shotTimerRef.current = null;
    }
    setShotTimer(SHOT_TIMER_SECS);
  }, []);

  const resetAfterShot = useCallback(() => {
    stopShotTimer();
    releaseBall();
    phaseRef.current = 'juggling';
    setPhase('juggling');
    setJuggleCount(0);
    juggleCountRef.current = 0;
    shotResultRef.current = false;
  }, [stopShotTimer]);

  const handleUpdate = useCallback((b: BallState) => {
    ballAnimX.setValue(b.x - BALL_RADIUS);
    ballAnimY.setValue(b.y - BALL_RADIUS);
    // GK keeps moving in ALL phases
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
    const ballX = pos?.x ?? width / 2;
    const goalCentreY = goalTop - GOAL_HEIGHT / 2;
    const distToGoal = Math.abs((pos?.y ?? 0) - goalCentreY);

    // Curve: spin proportional to how far right/left of ball the touch was
    // touchOffsetXRef > 0 means touch was to the right → ball curves left (negative spin)
    const curveSpin = -touchOffsetXRef.current * 0.15;

    // Overshoot: high power + close range tilts the shot upward randomly
    let finalAngle = aimAngleRef.current;
    if (powerRef.current >= OVER_BAR_POWER_THRESHOLD && distToGoal < OVER_BAR_CLOSE_DISTANCE) {
      // Tilt angle upward (more negative y component)
      finalAngle = finalAngle - (Math.random() * 0.3 + 0.15);
    }

    shoot(finalAngle, powerRef.current, curveSpin);
    phaseRef.current = 'shot';
    setPhase('shot');
    resetTimerRef.current = setTimeout(() => {
      if (!shotResultRef.current) showMessage('Miss!', 1000);
      resetAfterShot();
    }, 3000);
  }, [shoot, resetAfterShot, stopShotTimer, getBallPos, width, goalTop]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        if (phaseRef.current === 'trapped' || phaseRef.current === 'aiming') {
          const pos = getBallPos();
          if (pos) {
            touchOffsetXRef.current = evt.nativeEvent.locationX - pos.x;
          }
        }
      },

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
            // Start shot timer when player begins aiming
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      stopShotTimer();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [stopShotTimer]);

  // Compute full aim arc from ball to goal
  const aimData = (phase === 'aiming' || phase === 'trapped') ? (() => {
    const pos = getBallPos();
    if (!pos) return { dots: [], targetX: width / 2, clear: true };

    const dx = Math.cos(aimAngle);
    const dy = Math.sin(aimAngle);
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
  const timerDanger = shotTimer <= 3;

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers}>

      {/* Pitch markings */}
      <PitchMarkings width={width} height={height} goalTop={goalTop} />

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

      {/* Shot timer */}
      {phase === 'aiming' && (
        <View style={[styles.timerBadge, timerDanger && styles.timerBadgeDanger]}>
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

  // Pitch markings
  pitchLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  pitchCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
  },
  pitchSpot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  ball: {
    position: 'absolute',
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
  },

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

  // Shot timer
  timerBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerBadgeDanger: {},
  timerText: { color: 'rgba(255,255,255,0.85)', fontSize: 40, fontWeight: 'bold' },
  timerTextDanger: { color: '#ff4444' },

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
