// Example file path: app/page.tsx (or your main component file)
"use client";

import React, {
  useRef,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
  useCallback,
} from 'react';
import { Camera } from 'web-gphoto2';
import { useReactToPrint } from 'react-to-print';

// --- Import your custom components ---
// !! Make sure these files exist and paths are correct !!
import { ImageGrid } from './ImageGrid';
import { CapturedImageDisplay } from './CapturedImageDisplay';

// --- Import CSS ---
import "./globals.css"; // Contains .overlay styles etc.

// --- Enum for Countdown ---
enum CountdownStateEnum {
  Clear,
  Three,
  Two,
  One,
  Cheese,
  Print,
  Reset,
}

// --- Camera Setup Function ---
async function setupCamera(
  camera: Camera,
  setCameraReady: Dispatch<SetStateAction<boolean>>
) {
  try {
    console.log('Requesting camera picker...');
    await Camera.showPicker();
    console.log('Picker shown, connecting to camera...');
    await camera.connect();
    console.log('Camera connected successfully.');
    setCameraReady(true);
  } catch (error) {
    console.error('Failed to setup camera:', error);
    setCameraReady(false);
  }
}

// --- Capture Logic Function (Returns Blob or null) ---
async function captureAndDisplay(
  camera: Camera,
  setIsCapturing: Dispatch<SetStateAction<boolean>>
): Promise<Blob | null> {
  console.log('%cSetting isCapturing state to true', 'color: blue; font-weight: bold;');
  setIsCapturing(true);
  console.log('Starting capture process...');
  let capturedFile: Blob | null = null;

  try {
    console.log('>>> Awaiting camera.captureImageAsFile()...');
    const file = await camera.captureImageAsFile();
    console.log('<<< captureImageAsFile() successful.');
    console.log('File captured:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    capturedFile = file;

    try {
        console.log("%c>>> Consuming camera events after capture...", "color: purple;");
        await camera.consumeEvents();
        console.log("%c<<< camera.consumeEvents() finished.", "color: purple;");
    } catch(eventError) {
        console.error('%cError during camera.consumeEvents():', 'color: red;', eventError);
    }

  } catch (error) {
    console.error('%cError during capture or processing:', 'color: red;', error);
     if (error instanceof Error) {
        console.error("Error details:", error.message);
    }
    capturedFile = null;
  } finally {
    console.log('%c>>> Entered captureAndDisplay finally block.', 'color: green;');
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay
    console.log('%c<<< Setting isCapturing state to false', 'color: blue; font-weight: bold;');
    setIsCapturing(false);
    console.log('Capture flag released via state update.');
  }
  console.log('--- Exiting captureAndDisplay function ---');
  return capturedFile;
}


// --- Camera Preview Component ---
// (Keep this definition here or import it if moved to a separate file)
interface CameraPreviewProps {
  camera: Camera | null;
  cameraReady: boolean;
  isCapturing: boolean;
  onPreviewClick: () => void;
}

function CameraPreview(props: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number | null>(null);
  const isActive = useRef(true);

  useEffect(() => {
    isActive.current = true;

    async function renderFrame() {
      if (!isActive.current || !props.cameraReady || !canvasRef.current || !props.camera || props.isCapturing) {
         if (isActive.current) {
             animationFrame.current = requestAnimationFrame(renderFrame);
         }
         return;
      }

      try {
        const blob = await props.camera.capturePreviewAsBlob();
        if (!isActive.current || props.isCapturing) return;
        const bitmap = await createImageBitmap(blob);
        if (!isActive.current || props.isCapturing) { bitmap.close(); return; }
        const canvas = canvasRef.current;
        if (!canvas) { bitmap.close(); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { bitmap.close(); return; }

        if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();

      } catch (error) {
         if (isActive.current && !(error instanceof DOMException && error.name === 'InvalidStateError')) {
             console.warn('Preview render error:', error);
         }
      } finally {
        if (isActive.current) {
           await new Promise(r => setTimeout(r, 1000 / 24)); // ~24 FPS
           if (isActive.current) {
                animationFrame.current = requestAnimationFrame(renderFrame);
           }
        }
      }
    }

    if (props.cameraReady && props.camera) {
        if(animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
        renderFrame();
    } else {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return () => {
      isActive.current = false;
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [props.cameraReady, props.camera, props.isCapturing]);

  return (
    <canvas
      ref={canvasRef}
      onClick={props.onPreviewClick}
      style={{
        minHeight: "95vh",
        border: '1px solid grey',
        backgroundColor: '#f0f0f0',
        alignSelf: 'center',
        cursor: props.cameraReady && !props.isCapturing ? 'pointer' : 'wait',
      }}
    />
  );
}

// --- Countdown Component ---
// (Keep this definition here or import it if moved to a separate file)
interface CountdownComponentProps {
  countdownState: CountdownStateEnum;
  setCountdownState: Dispatch<SetStateAction<CountdownStateEnum>>;
  captureFunc: () => Promise<void>;
  cameraReady: boolean;
  isCapturing: boolean;
  capturesCompleted: number;
  onPreviewClick: () => void;
}

function CountdownComponent({
  countdownState,
  setCountdownState,
  captureFunc,
  cameraReady,
  isCapturing,
  capturesCompleted,
  onPreviewClick,
}: CountdownComponentProps) {

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    const transition = (nextState: CountdownStateEnum, delay: number) => {
      timerId = setTimeout(() => {
        setCountdownState(nextState);
      }, delay);
    };

    switch (countdownState) {
      case CountdownStateEnum.Three:
        transition(CountdownStateEnum.Two, 1000);
        break;
      case CountdownStateEnum.Two:
        transition(CountdownStateEnum.One, 1000);
        break;
      case CountdownStateEnum.One:
        transition(CountdownStateEnum.Cheese, 1000);
        break;
      case CountdownStateEnum.Cheese:
        captureFunc();
        transition(CountdownStateEnum.Clear, 1000); // Clear after showing "Cheese!"
        break;
      case CountdownStateEnum.Clear:
        break;
    }

    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [countdownState, setCountdownState, captureFunc]);

  switch (countdownState) {
    case CountdownStateEnum.Clear:
      if (cameraReady && !isCapturing && capturesCompleted === 0) {
        return <div className='tap-to-start' onClick={onPreviewClick}><p style={{padding: "25%", borderColor: "white"}}>Tap to Start</p></div>;
      }
      return null;
    // Ensure your globals.css has styles for .overlay, .circle, .countdown-text etc.
    case CountdownStateEnum.Three:
      return <div className="overlay"><div className="@container circle red"><p className="countdown-text">3</p></div></div>;
    case CountdownStateEnum.Two:
      return <div className="overlay"><div className="@container circle yellow"><p className="countdown-text">2</p></div></div>;
    case CountdownStateEnum.One:
      return <div className="overlay"><div className="@container circle green"><p className="countdown-text">1</p></div></div>;
    case CountdownStateEnum.Cheese:
      return <div className="overlay"><div className="@container circle blue"><p className="countdown-text cheese-text">Cheese!</p></div></div>;
    default:
      return null;
  }
}


// --- Main Page Component ---
export default function Home() {
  // State variables
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); // Individual capture busy state
  const [countdownStateVal, setCountdownStateVal] = useState<CountdownStateEnum>(CountdownStateEnum.Clear);
  const [capturedImageBlobs, setCapturedImageBlobs] = useState<Blob[]>([]);
  const [capturesCompleted, setCapturesCompleted] = useState<number>(0);
  const [previewVisibility, setPreviewVisibility] = useState<boolean>(false);

  // Configuration
  const totalCapturesNeeded = 3;

  // Ref for printing
  const gridRef = useRef<HTMLDivElement>(null); // Ref for the ImageGrid component's root element

  // Derived state
  const isSequenceComplete = (capturesCompleted === totalCapturesNeeded) && (capturedImageBlobs.length === totalCapturesNeeded);

  // Reset Sequence Handler
  const handleResetSequence = useCallback(() => {
    console.log('Resetting sequence state.');
    setCapturedImageBlobs([]);
    setCapturesCompleted(0);
    setCountdownStateVal(CountdownStateEnum.Clear);
    setPreviewVisibility(false);
  }, []); // No dependencies needed for reset logic

  function handlePreviewRender(): Promise<void> {
    setPreviewVisibility(true);
    // Give time for preview to render.
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  // const printPageStyle = `
  //  @page { size: landscape; } 
  //  `
  const triggerPrint = useReactToPrint({
    contentRef: gridRef,
    documentTitle: "",
    onBeforePrint: handlePreviewRender,
    onAfterPrint: handleResetSequence, // <-- Call reset *after* printing
    preserveAfterPrint: false, // Often good practice for clean-up
    // pageStyle: printPageStyle,
  });

  // Initialize camera effect
  useEffect(() => {
    console.log("Initializing camera instance...");
    const cam = new Camera();
    setCamera(cam);
    return () => {
      console.log("Disconnecting camera on component unmount...");
      cam.disconnect().catch(err => console.error("Error disconnecting camera:", err));
      setCamera(null);
      setCameraReady(false);
      // Reset sequence state on unmount too
      setCapturedImageBlobs([]);
      setCapturesCompleted(0);
      setCountdownStateVal(CountdownStateEnum.Clear);
    };
  }, []);

  useEffect(() => {
    // Only trigger if the sequence *just* became complete and triggerPrint is available
    if (isSequenceComplete && triggerPrint) {
        console.log("Sequence complete. Triggering print...");
        // Add a small delay (optional but often helpful)
        // This allows React to finish its render cycle before opening the print dialog,
        // which can help ensure the ref is 100% ready and content is painted.
        const timer = setTimeout(() => {
             triggerPrint();
        }, 500); // 0.5 second delay

        return () => clearTimeout(timer); // Cleanup timer if component unmounts quickly
    }
  }, [isSequenceComplete, triggerPrint]); // Rerun only when isSequenceComplete or triggerPrint changes

  // Connect Camera Handler
  const handleConnectClick = () => {
    if (camera && !cameraReady) {
      setupCamera(camera, setCameraReady);
    }
  };

  // Capture Trigger (called by Countdown)
  const triggerCapture = useCallback(async () => {
    if (!camera || !cameraReady) {
      console.log('Capture skipped (camera not ready)');
      setCountdownStateVal(CountdownStateEnum.Clear);
      setCapturesCompleted(0); // Reset sequence
      return;
    }

    console.log(`%cAttempting capture ${capturesCompleted + 1} of ${totalCapturesNeeded}...`, 'color: orange; font-weight: bold;');
    const newBlob = await captureAndDisplay(camera, setIsCapturing);

    if (newBlob) {
      console.log(`%cCapture ${capturesCompleted + 1} successful.`, 'color: green;');
      setCapturedImageBlobs(prevBlobs => [...prevBlobs, newBlob]);
      setCapturesCompleted(prevCount => {
        const nextCount = prevCount + 1;
        if (nextCount < totalCapturesNeeded) {
          console.log(`%cSequence continuing, starting countdown for capture ${nextCount + 1}...`, 'color: orange;');
          setTimeout(() => setCountdownStateVal(CountdownStateEnum.Three), 100); // Restart countdown
        } else {
          console.log('%cSequence complete.', 'color: green; font-weight: bold;');
          // Countdown will clear itself after "Cheese!"
        }
        return nextCount;
      });
    } else {
      console.error(`%cCapture ${capturesCompleted + 1} failed. Stopping sequence.`, 'color: red; font-weight: bold;');
      setCountdownStateVal(CountdownStateEnum.Clear);
      // Decide whether to reset completed count on failure
      // setCapturesCompleted(0);
    }
  }, [camera, cameraReady, capturesCompleted, totalCapturesNeeded, setIsCapturing, setCountdownStateVal, setCapturedImageBlobs, setCapturesCompleted]); // Dependencies

  // Start Sequence Handler (called by Preview Click)
  const startCountdownSequence = useCallback(() => {
    if (!cameraReady || isCapturing || capturesCompleted > 0) {
      console.log('Countdown start skipped. State:', { cameraReady, isCapturing, capturesCompleted });
      return;
    }
    console.log('%cStarting new capture sequence...', 'color: blue; font-weight: bold;');
    setCapturedImageBlobs([]); // Clear previous images
    setCapturesCompleted(0);    // Reset count
    setCountdownStateVal(CountdownStateEnum.Three); // Start first countdown
  }, [cameraReady, isCapturing, capturesCompleted, setCapturedImageBlobs, setCapturesCompleted, setCountdownStateVal]); // Dependencies

  // --- JSX Rendering ---
  return (
    <div>
      <div style={{ display: 'block', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0px', alignItems: 'flex-start' }}>
        <div style={{   display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh'}}>
          <CameraPreview
            camera={camera}
            cameraReady={cameraReady}
            isCapturing={isCapturing}
            // Only allow STARTING the sequence via click
            onPreviewClick={
                !cameraReady ? handleConnectClick : (capturesCompleted === 0 ? startCountdownSequence : () => { console.log("Click ignored: Sequence active or finished."); })
              }
          />
          <CountdownComponent
            countdownState={countdownStateVal}
            setCountdownState={setCountdownStateVal}
            captureFunc={triggerCapture}
            cameraReady={cameraReady}
            isCapturing={isCapturing}
            capturesCompleted={capturesCompleted}
            onPreviewClick={
              !cameraReady ? handleConnectClick : (capturesCompleted === 0 ? startCountdownSequence : () => { console.log("Click ignored: Sequence active or finished."); })
            }
          />
        </div>
      </div>
      {isSequenceComplete &&
      <ImageGrid
        ref={gridRef} // Pass the ref here
        capturedBlobs={capturedImageBlobs}
        previewVisibility={previewVisibility}
      /> }
    </div>
  );
}