import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createTele } from './teleEngine.js';

/**
 * <Tele mood={{ joy: .4 }} jacket onWord={(i, word) => ...} ref={teleRef} />
 *
 * ref methods: playClip(clip), stop(), react(mood, seconds), channelChange(), look(x, y, seconds)
 * Put the contents of public/tele/ at spriteBase (default "/tele/").
 */
const Tele = forwardRef(function Tele({ mood, jacket = true, spriteBase = '/tele/', onWord, onEnd, className, style }, ref) {
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const handlers = useRef({});
  handlers.current = { onWord, onEnd };

  useEffect(() => {
    const e = createTele(canvasRef.current, {
      base: spriteBase,
      jacket,
      onWord: (i, w) => handlers.current.onWord?.(i, w),
      onEnd: (done) => handlers.current.onEnd?.(done),
    });
    engine.current = e;
    return () => { e.destroy(); engine.current = null; };
  }, [spriteBase]); // eslint-disable-line react-hooks/exhaustive-deps

  const moodKey = JSON.stringify(mood || {});
  useEffect(() => { engine.current?.setMood(mood || {}); }, [moodKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { engine.current?.setJacket(jacket); }, [jacket]);

  useImperativeHandle(ref, () => ({
    playClip: (clip) => engine.current?.playClip(clip) ?? Promise.resolve(false),
    stop: () => engine.current?.stop(),
    react: (m, s) => engine.current?.react(m, s),
    channelChange: () => engine.current?.channelChange(),
    look: (x, y, s) => engine.current?.look(x, y, s),
  }), []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', aspectRatio: '400 / 360', ...style }}
      role="img"
      aria-label="Tele, a 1970s television with one realistic eye on its screen, wearing a striped turtleneck and a patchwork corduroy jacket"
    />
  );
});

export default Tele;
