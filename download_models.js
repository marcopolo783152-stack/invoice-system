const fs = require('fs');
const path = require('path');
const https = require('https');

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.weights.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.weights.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.weights.bin'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const destDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading models...');
  for (const model of models) {
    console.log(`Downloading ${model}...`);
    await download(baseUrl + model, path.join(destDir, model));
  }
  console.log('Done!');
}

run();
