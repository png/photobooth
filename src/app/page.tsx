"use client";

import { SetStateAction, useState, useEffect, useRef, Dispatch } from "react";
import { Camera } from "web-gphoto2";

async function setupCamera(camera: Camera, setCameraReady: Dispatch<SetStateAction<boolean>>) {
  await Camera.showPicker();
  await new Promise(result => setTimeout(result, 1500));
  await camera.connect();
  setCameraReady(true);
}

async function captureCamera(camera: Camera) {
  await camera.captureImageAsFile();
}

function CameraPreview(props: {
  camera: Camera,
  cameraReady: boolean,
}) {
  const canvasRef = useRef(null);
  const animationFrame = useRef(null);

  useEffect(() => {

    async function renderFrame() {
      if(!props.cameraReady) return;
      props.camera.capturePreviewAsBlob()
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => {
          const canvas = canvasRef.current;
          if(!canvas || canvas == null) return;
          const ctx = canvas.getContext('2d');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          ctx.drawImage(bitmap, 0, 0);
        })
      animationFrame.current = requestAnimationFrame(renderFrame);
      }
    renderFrame();
  })
  console.log("Preview refresh", props.cameraReady);
  return <canvas ref={canvasRef}/>
}

function IntroHeader() {
  return <h1>Hi!</h1>
}

export default function Home() {
  const [camera, setCamera] = useState(new Camera());
  const [cameraReady, setCameraReady] = useState(false);
  return (
    <>
        <IntroHeader/>
        <text>What?</text>
        <button onClick={() => setupCamera(camera, setCameraReady)}>Connect</button>
        <button onClick={() => captureCamera(camera)}>Capture</button>
        <CameraPreview camera={camera} cameraReady={cameraReady}></CameraPreview>
    </>
  );
}
