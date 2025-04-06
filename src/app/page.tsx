"use client";

import { useEffect } from "react";
import { Camera } from "web-gphoto2";

async function setupCamera() {
  console.log("Clicked");
  const camera = new Camera();
  await Camera.showPicker();
  await camera.connect();
}


function CameraPreview() {
  return <canvas/>
}

function IntroHeader() {
  return <h1>Hi!</h1>
}

export default function Home() {
  return (
    <>
        <IntroHeader/>
        <text>What?</text>
        <button onClick={setupCamera}>Connect</button>
        <CameraPreview></CameraPreview>
    </>
  );
}
