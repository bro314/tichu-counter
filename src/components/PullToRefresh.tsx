import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

interface PullToRefreshProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  scrollRef,
  onRefresh,
  children,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isPulling = useRef(false);

  const onRefreshRef = useRef(onRefresh);
  const refreshingRef = useRef(refreshing);
  const pullDistanceRef = useRef(pullDistance);

  // Keep references updated to avoid re-binding touch listeners on state change
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    refreshingRef.current = refreshing;
    pullDistanceRef.current = pullDistance;
  }, [onRefresh, refreshing, pullDistance]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startY = 0;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pulling if the container is scrolled to the absolute top
      if (el.scrollTop === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0 && el.scrollTop === 0) {
        // Apply rubber-banding (resistance) physics
        const distance = Math.min(80, Math.pow(diff, 0.85));

        // Prevent the whole viewport from bouncing (WebView standard)
        if (e.cancelable) {
          e.preventDefault();
        }

        setPullDistance(distance);
      } else {
        // If swiping up or scrolling away, reset the pull state
        pulling = false;
        isPulling.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!pulling) return;
      pulling = false;
      isPulling.current = false;

      const currentDistance = pullDistanceRef.current;
      if (currentDistance >= 60 && !refreshingRef.current) {
        setRefreshing(true);
        setPullDistance(50); // resting position while loading
        try {
          await onRefreshRef.current();
        } catch (err) {
          console.error("Refresh error:", err);
        } finally {
          setPullDistance(0);
          setRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scrollRef]);

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Visual Refresh Indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          left: "50%",
          transform: `translate3d(-50%, ${pullDistance - 50}px, 0)`,
          opacity: Math.min(1, pullDistance / 40),
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.paper",
          borderRadius: "50%",
          width: 38,
          height: 38,
          boxShadow: 3,
          transition: isPulling.current
            ? "none"
            : "transform 0.2s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.2s",
        }}
      >
        <CircularProgress
          size={20}
          thickness={4.5}
          variant={refreshing ? "indeterminate" : "determinate"}
          value={refreshing ? undefined : Math.min(100, (pullDistance / 50) * 100)}
          sx={{
            color: "primary.main",
          }}
        />
      </Box>

      {/* Main Content Pane */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          transform: `translate3d(0, ${pullDistance}px, 0)`,
          transition: isPulling.current
            ? "none"
            : "transform 0.2s cubic-bezier(0.1, 0.8, 0.3, 1)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default PullToRefresh;
