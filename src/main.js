import App from './App.js';

const chart = document.querySelector('chart');
let mic;
let app;
let fft;


const p = new p5((p) => {
  p.setup = () => {
    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT();
    app = new App(400, 600);
    p.createCanvas(app.width, app.height).parent(chart);
  };
  p.draw = () => app.onFrame();
});
export { p as p5, app, mic, fft };

window.onclick = () => p.getAudioContext().resume();