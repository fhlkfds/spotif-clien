import { useRef, useCallback, useEffect } from "react";
import { useStore } from "../store/useStore";

/**
 * Picture-in-Picture player using Canvas + captureStream().
 * Creates a small floating video window showing album art + track info.
 */
export function usePiP() {
  const { playbackState } = useStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const animRef = useRef<number | null>(null);
  const lastTrackId = useRef<string | null>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const track = playbackState?.item;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Album art
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, 160, 160);
      // Dark overlay for text
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 110, 320, 50);
    }

    // Track name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const trackName = track?.name ?? "Nothing playing";
    ctx.fillText(trackName.length > 28 ? trackName.slice(0, 28) + "…" : trackName, 168, 35);

    // Artist
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "12px system-ui, sans-serif";
    const artist = track?.artists?.map((a) => a.name).join(", ") ?? "";
    ctx.fillText(artist.length > 30 ? artist.slice(0, 30) + "…" : artist, 168, 55);

    // Album
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px system-ui, sans-serif";
    const album = track?.album?.name ?? "";
    ctx.fillText(album.length > 32 ? album.slice(0, 32) + "…" : album, 168, 73);

    // Playing indicator
    const isPlaying = playbackState?.is_playing;
    ctx.fillStyle = isPlaying ? "#1db954" : "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(168, 100, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(isPlaying ? "Playing" : "Paused", 178, 100);

    // Progress bar
    const progress = playbackState?.progress_ms ?? 0;
    const duration = track?.duration_ms ?? 1;
    const pct = progress / duration;
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(168, 115, 140, 3);
    ctx.fillStyle = "#1db954";
    ctx.fillRect(168, 115, 140 * pct, 3);
  }, [playbackState]);

  // Update album art image when track changes
  useEffect(() => {
    const track = playbackState?.item;
    if (!track || track.id === lastTrackId.current) return;
    lastTrackId.current = track.id;
    const imgUrl = track.album?.images?.[0]?.url;
    if (!imgUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;
    img.onload = () => { imgRef.current = img; };
  }, [playbackState?.item?.id]);

  // Animate canvas
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.pictureInPictureEnabled) return;

    if (!canvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 160;
      canvas.style.display = "none";
      document.body.appendChild(canvas);
      canvasRef.current = canvas;
    }

    let raf: number;
    const animate = () => {
      drawFrame();
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    animRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [drawFrame]);

  const enterPiP = useCallback(async () => {
    try {
      if (!document.pictureInPictureEnabled) {
        alert("Picture-in-Picture is not supported in this browser.");
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create or reuse video element
      let video = videoRef.current;
      if (!video) {
        video = document.createElement("video");
        video.style.display = "none";
        video.muted = true;
        video.autoplay = true;
        document.body.appendChild(video);
        videoRef.current = video;
      }

      const stream = (canvas as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(2);
      video.srcObject = stream;
      await video.play();
      await video.requestPictureInPicture();
    } catch (e) {
      console.error("PiP error:", e);
    }
  }, []);

  const exitPiP = useCallback(async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  }, []);

  const isPiP = typeof document !== "undefined" && !!document.pictureInPictureElement;

  return { enterPiP, exitPiP, isPiP };
}
