import {useEffect, useRef, useState} from 'react';

import {
  Category,
  DrawingUtils,
  FaceLandmarker,
  FaceLandmarkerResult,
  FilesetResolver
} from '@mediapipe/tasks-vision';
import './index.scss';

const wasmFolderPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
const FaceContainer = () => {
  const [inputVideoReady, setInputVideoReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const inputVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const descriptionRef = useRef<HTMLUListElement | null>(null);


  const [face, setFace] = useState<FaceLandmarker | null>();

  const sendToMediaPipe = async () => {
    if (inputVideoRef.current) {
      if (!inputVideoRef.current.videoWidth) {
        console.log(inputVideoRef.current.videoWidth);
        requestAnimationFrame(sendToMediaPipe);
      } else {
        let startTimeMs = performance.now();
        if (face != null) {
          const results = face.detectForVideo(inputVideoRef.current, startTimeMs);
          onResults(results);
        }

        requestAnimationFrame(sendToMediaPipe);
      }
    }
  };

  const getFace = async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
        wasmFolderPath
    )
    return await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1
    });
  }

  useEffect(() => {
    if (face !== undefined) {
      sendToMediaPipe();
    } else {
      getFace().then((face) => {
        setFace(face);
      });
    }
  }, [face]);

  useEffect(() => {
    if (!inputVideoReady) {
      return;
    }
    if (inputVideoRef.current && canvasRef.current) {
      console.log('rendering');
      contextRef.current = canvasRef.current.getContext('2d');
      const constraints = {
        video: {width: {min: 1280}, height: {min: 720}},
      };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        if (inputVideoRef.current) {
          inputVideoRef.current.srcObject = stream;
        }

      });
    }
  }, [inputVideoReady]);

  const drawBlendShapes = (blendShapes: any[]) => {
    if (!blendShapes.length || !descriptionRef.current) {
      return;
    }

    console.log(blendShapes[0]);

    let htmlMaker = "";
    blendShapes[0].categories.map((shape: Category) => {
      htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${
          shape.displayName || shape.categoryName
      }</span>
        <span class="blend-shapes-value" style="width: calc(${
          +shape.score * 100
      }% - 120px)">${(+shape.score).toFixed(4)}</span>
      </li>
    `;
    });

    descriptionRef.current.innerHTML = htmlMaker;
  }

  const onResults = (results: FaceLandmarkerResult) => {
    if (canvasRef.current && contextRef.current) {
      setLoaded(true);

      const drawingUtils = new DrawingUtils(contextRef.current);
      contextRef.current.save();
      contextRef.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
      );

      if (results.faceLandmarks) {
        for (const landmarks of results.faceLandmarks) {
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              {color: "#C0C0C070", lineWidth: 1}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
              {color: "#FF3030"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
              {color: "#FF3030"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
              {color: "#30FF30"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
              {color: "#30FF30"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              {color: "#E0E0E0"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LIPS,
              {color: "#E0E0E0"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
              {color: "#FF3030"}
          );
          drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
              {color: "#30FF30"}
          );
        }
      }
      contextRef.current.restore();
    }

    drawBlendShapes(results.faceBlendshapes || []);
  }

  return (
      <>
        <div className="face-container">
          <video
              autoPlay
              ref={(el) => {
                inputVideoRef.current = el;
                setInputVideoReady(!!el);
              }}
          />
          <canvas ref={canvasRef} width={1280} height={720}/>
          {!loaded && (
              <div className="loading">
                <div className="spinner"></div>
                <div className="message">Loading</div>
              </div>
          )}
        </div>
        <ul ref={descriptionRef} className='desc'></ul>
      </>
  );
};

export default FaceContainer;
