import { toGrayscale, type GrayImage, type RGBAImage } from "../core/image.js";

export interface CameraOptions {
  /** Requested capture width. Default 640. */
  width?: number;
  /** Requested capture height. Default 480. */
  height?: number;
  /** Use an existing video element instead of creating a hidden one. */
  video?: HTMLVideoElement;
  /** Extra constraints merged into the getUserMedia video constraints. */
  constraints?: MediaTrackConstraints;
}

/**
 * Modern webcam capture: `navigator.mediaDevices.getUserMedia` +
 * `video.srcObject` (camgaze v1 used the long-removed `navigator.getUserMedia`
 * and `URL.createObjectURL(stream)`), with a reusable offscreen canvas marked
 * `willReadFrequently` for cheap pixel readback.
 */
export class Camera {
  readonly video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private ctx:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  private readonly requestedWidth: number;
  private readonly requestedHeight: number;
  private readonly constraints?: MediaTrackConstraints;
  private grayBuffer: GrayImage | null = null;

  constructor(options: CameraOptions = {}) {
    this.requestedWidth = options.width ?? 640;
    this.requestedHeight = options.height ?? 480;
    this.constraints = options.constraints;
    this.video = options.video ?? document.createElement("video");
    this.video.playsInline = true;
    this.video.muted = true;

    if (typeof OffscreenCanvas !== "undefined") {
      this.canvas = new OffscreenCanvas(1, 1);
      this.ctx = this.canvas.getContext("2d", {
        willReadFrequently: true,
      }) as OffscreenCanvasRenderingContext2D;
    } else {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;
    }
  }

  /** Request camera access and start playback. Resolves once frames flow. */
  async start(): Promise<void> {
    if (this.stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "navigator.mediaDevices.getUserMedia is unavailable — camgaze requires a secure context (https or localhost)"
      );
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: this.requestedWidth },
        height: { ideal: this.requestedHeight },
        facingMode: "user",
        ...this.constraints,
      },
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    if (this.video.readyState < this.video.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) =>
        this.video.addEventListener("loadeddata", () => resolve(), {
          once: true,
        })
      );
    }
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
  }

  /** Stop the camera and release the hardware. */
  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
  }

  get running(): boolean {
    return this.stream !== null;
  }

  get width(): number {
    return this.video.videoWidth;
  }

  get height(): number {
    return this.video.videoHeight;
  }

  /** Grab the current frame as RGBA pixels. */
  getFrame(): RGBAImage {
    this.ctx.drawImage(this.video, 0, 0);
    return this.ctx.getImageData(
      0,
      0,
      this.canvas.width as number,
      this.canvas.height as number
    );
  }

  /** Grab the current frame directly as grayscale (buffer reused). */
  getGrayFrame(): GrayImage {
    const frame = this.getFrame();
    if (
      !this.grayBuffer ||
      this.grayBuffer.width !== frame.width ||
      this.grayBuffer.height !== frame.height
    ) {
      this.grayBuffer = {
        width: frame.width,
        height: frame.height,
        data: new Uint8ClampedArray(frame.width * frame.height),
      };
    }
    return toGrayscale(frame, this.grayBuffer);
  }
}
