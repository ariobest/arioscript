import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(8);
      timer.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p));
      }, 120);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 350);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div className="route-progress" data-visible={visible} aria-hidden>
      <div className="route-progress-bar" style={{ width: `${progress}%` }}>
        <span className="route-progress-spark" />
      </div>
    </div>
  );
}
