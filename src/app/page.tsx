"use client";

import React, {
  useRef,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { Camera } from 'web-gphoto2';

// --- Camera Setup ---
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

// --- Image Display Component ---
function CapturedImageDisplay(props: { capturedImageBlob: Blob | null }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (props.capturedImageBlob) {
      objectUrl = URL.createObjectURL(props.capturedImageBlob);
      console.log('Created Object URL:', objectUrl);
      setImageSrc(objectUrl);
    } else {
      setImageSrc(null); // Clear image if blob is null
    }

    // Cleanup function
    return () => {
      if (objectUrl) {
        console.log('Revoking Object URL:', objectUrl);
        URL.revokeObjectURL(objectUrl);
        setImageSrc(null); // Clear image source on cleanup/new blob
      }
    };
  }, [props.capturedImageBlob]);

  if (!imageSrc) {
    return <p>No image captured yet.</p>;
  }

  return (
    <img
      src={imageSrc}
      alt="Captured"
      style={{ maxWidth: '100%', height: 'auto', border: '1px solid lightgrey' }}
    />
  );
}

// --- Capture and Display Logic (Refactored to use state setter) ---
async function captureAndDisplay(
  camera: Camera,
  setCapturedImageBlob: Dispatch<SetStateAction<Blob | null>>,
  // *** Accept setIsCapturing state setter ***
  setIsCapturing: Dispatch<SetStateAction<boolean>>
) {
  // Initial check 'if (isCapturing)' is now done in the caller (handleCaptureClick)

  console.log('%cSetting isCapturing state to true', 'color: blue; font-weight: bold;');
  // *** Set state to true at the beginning ***
  setIsCapturing(true);
  setCapturedImageBlob(null); // Clear previous image
  console.log('Starting capture process...');

  try {
    console.log('>>> Awaiting camera.captureImageAsFile()...');
    const file = await camera.captureImageAsFile();
    console.log('<<< captureImageAsFile() successful.');

    console.log('File captured:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    console.log('Updating display state...');
    setCapturedImageBlob(file); // Display the image
    console.log('Display state updated.');

    // *** Consume events to clear camera state (Keep this fix) ***
    try {
        console.log("%c>>> Consuming camera events after capture...", "color: purple;");
        const hadEvents = await camera.consumeEvents(); // Clear pending events
        console.log("%c<<< camera.consumeEvents() returned:", "color: purple;", hadEvents);
    } catch(eventError) {
        console.error('%cError during camera.consumeEvents():', 'color: red;', eventError);
    }
    // ********************************************************

  } catch (error) {
    console.error('%cError during capture or processing:', 'color: red;', error);
     if (error instanceof Error) {
        console.error("Error details:", error.message);
    }
    setCapturedImageBlob(null); // Clear image on error
  } finally {
    console.log('%c>>> Entered finally block.', 'color: green;');
    // Optional: Delay might still be useful, test removing it if desired
    console.log('Adding short delay before releasing capture flag...');
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('%c<<< Setting isCapturing state to false', 'color: blue; font-weight: bold;');
    // *** Set state to false in finally block ***
    setIsCapturing(false);
    // No need to force update anymore
    console.log('Capture flag released via state update.');
  }
  console.log('--- Exiting captureAndDisplay function ---');
}


// --- Camera Preview Component (Updated to use isCapturing state) ---
interface CameraPreviewProps {
  camera: Camera | null; // Allow null initially
  cameraReady: boolean;
  // *** Accept isCapturing state ***
  isCapturing: boolean;
}

function CameraPreview(props: CameraPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrame = useRef<number | null>(null);
  const isActive = useRef(true); // Use ref to track mount status for async operations

  useEffect(() => {
    isActive.current = true; // Component is active

    async function renderFrame() {
      // *** Check isActive and use props.isCapturing state for pausing ***
      if (!isActive.current || !props.cameraReady || !canvasRef.current || !props.camera || props.isCapturing) {
         // Request next frame even if paused/not ready, to resume quickly or check again
         if (isActive.current) {
             animationFrame.current = requestAnimationFrame(renderFrame);
         }
         return;
      }

      try {
        // console.log('Preview: Requesting frame'); // Optional: trace preview calls
        const blob = await props.camera.capturePreviewAsBlob();

        // Check again after await in case component unmounted or capture started
        if (!isActive.current || props.isCapturing) return;

        const bitmap = await createImageBitmap(blob);
         if (!isActive.current || props.isCapturing) { bitmap.close(); return; }

        const canvas = canvasRef.current;
        if (!canvas) { bitmap.close(); return; }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Preview: Failed to get 2D context');
            bitmap.close();
            return;
        }

        if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
        }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close(); // Release bitmap resources

      } catch (error) {
         if (isActive.current && !(error instanceof DOMException && error.name === 'InvalidStateError')) {
             // Ignore InvalidStateError which might happen during disconnect/state changes
             console.warn('Preview render error:', error);
         }
      } finally {
        // Schedule the next frame if the component is still active
        if (isActive.current) {
           // Add slight delay to control FPS
           await new Promise(r => setTimeout(r, 1000 / 24)); // Target ~24 FPS
           if (isActive.current) { // Check again after timeout
                animationFrame.current = requestAnimationFrame(renderFrame);
           }
        }
      }
    }

    // Start the rendering loop only if camera is ready
    if (props.cameraReady && props.camera) {
        console.log('Preview: Starting render loop.');
        // Ensure previous frame is cancelled before starting new one
        if(animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
        renderFrame(); // Start the loop
    } else {
        console.log('Preview: Waiting for camera.');
         // Clear canvas if camera becomes not ready
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    // Cleanup function
    return () => {
      console.log('Preview: Cleaning up loop.');
      isActive.current = false; // Signal loop to stop
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    };
  }, [props.cameraReady, props.camera, props.isCapturing]); // Add isCapturing to dependencies

  return (
    <canvas
      ref={canvasRef}
      style={{ maxWidth: '100%', height: 'auto', border: '1px solid grey', backgroundColor: '#f0f0f0' }}
    />
  );
}

// --- Simple Header ---
function IntroHeader() {
  return <h1>Camera Control</h1>;
}

// --- Countdown Component ---
function CountdownComponent() {
  enum CountdownStateEnum {
    Clear,
    Three,
    Two,
    One,
    Cheese,
  };
  const [countdownStateVal, setCountdownStateVal] = useState(CountdownStateEnum.Clear);

  async function progressStateMachine() {
    await new Promise(r => setTimeout(r, 1000));
    setCountdownStateVal(countdownStateVal+1);
  }

  async function resetStateMachine() {
    await new Promise(r => setTimeout(r, 1000));
    setCountdownStateVal(CountdownStateEnum.Clear);
  }

  useEffect(() => {

  }, [countdownStateVal]);

  switch (countdownStateVal) {
    case CountdownStateEnum.Clear:
      progressStateMachine();
      return <text></text>
      break;
    case CountdownStateEnum.Three:
      progressStateMachine();
      return <text>3</text>
      break;
    case CountdownStateEnum.Two:
      progressStateMachine();
      return <text>2</text>
      break;
    case CountdownStateEnum.One:
      progressStateMachine();
      return <text>1</text>
      break;
    case CountdownStateEnum.Cheese:
      resetStateMachine();
      return <text>Cheese!</text>
      break;
    
    default:

      return <text>Wtf?</text>
      break;
  }
}

// --- Main Page Component (Using useState for isCapturing) ---
export default function Home() {
  // Use state for camera instance to ensure it's stable across renders
  const [camera, setCamera] = useState<Camera | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImageBlob, setCapturedImageBlob] = useState<Blob | null>(null);

  // *** Use useState for capturing state ***
  const [isCapturing, setIsCapturing] = useState(false);

  // Effect to initialize camera only once
   useEffect(() => {
    console.log("Initializing camera instance...");
    const cam = new Camera();
    setCamera(cam); // Store camera instance in state

    // Cleanup on unmount
    return () => {
        // console.log("Disconnecting camera on component unmount...");
        // cam.disconnect().catch(err => console.error("Error disconnecting camera:", err));
       setCamera(null); // Clear camera instance
       setCameraReady(false); // Reset ready state
    };
  }, []); // Empty dependency array ensures this runs only once

  // Click handler for Connect button
  const handleConnectClick = () => {
      if (camera && !cameraReady) {
          setupCamera(camera, setCameraReady);
      }
  };

  // Click handler for Capture button
  const handleCaptureClick = async () => {
    // Check conditions before calling async function
    if (!camera || !cameraReady || isCapturing) {
        console.log('Capture skipped (not ready or already capturing). State:', { cameraReady, isCapturing });
        return;
    }

    await captureAndDisplay(
      camera,
      setCapturedImageBlob,
      setIsCapturing // Pass state setter
    );
  };

  return (
    <>
      <IntroHeader />
      {/* Controls */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleConnectClick}
          disabled={cameraReady || !camera} // Disable if ready or no camera instance
        >
          {cameraReady ? 'Connected' : 'Connect Camera'}
        </button>
        <button
          onClick={handleCaptureClick}
          disabled={!cameraReady || isCapturing} // Disable if not ready OR capturing
        >
          {/* Text changes based on the isCapturing state */}
          {isCapturing ? 'Capturing...' : 'Capture Image'}
        </button>
      </div>
      {/* Status Indicators (Optional) */}
       <div style={{marginBottom: '10px', fontSize: '0.9em', opacity: 0.8}}>
           <p style={{margin: '2px 0'}}>Camera Ready: {cameraReady ? 'Yes' : 'No'}</p>
           <p style={{margin: '2px 0'}}>Capturing Active: {isCapturing ? 'Yes' : 'No'}</p>
       </div>

      {/* Display Area */}
      <div
        style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h2>Preview</h2>
          <CameraPreview
            camera={camera} // Pass camera instance from state
            cameraReady={cameraReady}
            isCapturing={isCapturing} // Pass capturing state
          />
        </div>
        <div>
          <h2>Captured Image</h2>
          <CapturedImageDisplay capturedImageBlob={capturedImageBlob} />
        </div>
        <CountdownComponent />
      </div>
    </>
  );
}