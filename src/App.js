import { p5, mic, fft } from './main.js';

export default class App {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.fftHeight = 200;

    this.micPoint = p5.createVector(300, 300);

    this.f1Point = p5.createVector(-10,-10);
    this.f2Point = p5.createVector(-10,-10);

    fft.setInput(mic);
  }

  onFrame() {
    p5.clear();
    p5.noStroke();
    p5.noFill();
    p5.strokeWeight(1);

    let spectrumValues = fft.analyze();
    spectrumValues = spectrumValues.slice(0, spectrumValues.length/2);
    spectrumValues = this.interpolateArray(spectrumValues, this.width);
    const spectrumPoints = this.values2Points(spectrumValues);
    this.drawChart(spectrumPoints, {
      color: '#555',
      rangeMin: 0,
      rangeMax: 255,
      height: this.fftHeight-20,
    });
    
    const hullPoints = this.countHall(spectrumPoints);
    this.drawChart(hullPoints, {
      color: '#f00',
      rangeMin: 0,
      rangeMax: 255,
      height: this.fftHeight-20,
    });

    this.drawPoint(this.f1Point, 'green', 10);
    this.drawPoint(this.f2Point, 'blue', 10);

    this.drawF1F2Chart();
    this.drawPoint(this.micPoint, 'white', 10);

    const vol = mic.getLevel();
    this.setPoint(this.micPoint, { x: this.width/2, y: this.fftHeight + vol*this.height*3 });

    const formants = this.findLocalMaxima(hullPoints);
    if (formants.length > 1) {
      this.setPoint(this.f1Point, { x: formants[0].x, y: formants[0].y });
      this.setPoint(this.f2Point, { x: formants[1].x, y: formants[1].y });
    }
  }

  // ------------------------------------------------------------------------------ drawing

  drawPoint({ x, y }, color, size) {
    p5.stroke(color);
    p5.circle(x, y, size);
  }

  drawChart(points, { color = 255, rangeMin = 0, rangeMax = 255, height = this.height }) {
    p5.stroke(color);
    p5.beginShape();
    points.map((point) => {
      p5.vertex(point.x, p5.map(point.y, rangeMin, rangeMax, height, 0));
    });
    p5.endShape();
  }

  drawF1F2Chart() {
    p5.stroke(255);
    p5.line(0, this.fftHeight, 0, this.height);
    p5.line(0, this.height, this.height, this.height);
  }

  // ------------------------------------------------------------------------------ computing

  values2Points = (valuesArr) => valuesArr.map((val, i) => p5.createVector(i, val));
  points2Values = (pointsArr) => pointsArr.map((point) => point.y);

  setPoint(point, { x, y }) { point.x = x; point.y = y; }

  interpolateArray(valuesArr, targetLength) {
    const linearInterpolate = (before, after, atPoint) => before + (after - before) * atPoint;
    const newData = [];
    const springFactor = new Number((valuesArr.length - 1) / (targetLength - 1));
    newData[0] = valuesArr[0]; // for new allocation
    for (let i = 1; i < targetLength - 1; i++) {
        const tmp = i * springFactor;
        const before = new Number(Math.floor(tmp)).toFixed();
        const after = new Number(Math.ceil(tmp)).toFixed();
        const atPoint = tmp - before;
        newData[i] = linearInterpolate(valuesArr[before], valuesArr[after], atPoint);
    }
    newData[targetLength - 1] = valuesArr[valuesArr.length - 1]; // for new allocation

    return newData;
  };

  findLocalMaxima(points) {
    if (points.length < 3) return [];

    const formants = []

    let lastPoint = points[0];
    let nextPoint = points[2];
    for (let i = 1; i < points.length-2; i++) {
      if (points[i].y - lastPoint.y > 0 && points[i].y - nextPoint.y > 0) {
        formants.push(points[i]);
      }
      lastPoint = points[i];
      nextPoint = points[i+2];
    }

    return formants;
  }
    
  countHall(spectrumPoints) {
    const trimmed = [];
    let flag = false;
    spectrumPoints.reverse().map((point) => {
      if (point.y > 0) flag = true;
      if (flag) {
        trimmed.push(point);
      }
    });
    trimmed.reverse();

    let hull = convexhull.makeHull(trimmed, 0.8);
    const hullTrimmed = [];

    if (hull.length > 0) {
      hullTrimmed.push(hull[0]);
      let last_x = hull[0].x;
  
      for (let i = 1; i < hull.length; ++i) {
        if (last_x > hull[i].x) {
          break;
        }
        last_x = hull[i].x;
        hullTrimmed.push(hull[i]);
      }
    }

    return hullTrimmed;
  }

  //? ------------------------------------------------------------------------------ deprecated

  fancySmoothing(arr, frameSize, shiftSize) {
    let result = [];
    for (let i=0; i<arr.length - frameSize; i+=shiftSize) {
      let sum = 0;
      let avg = 0;
      for (let j=0; j<frameSize; j++) {
        sum += arr[i+j];
      }
      avg = sum / frameSize;
      result.push(avg);
    }
    return result;
  }

  findPeaks(data, windowSize, numPeaks) {
    function getMaxIndex(arr) {
      let maxValue = arr[0];
      let maxIndex = 0;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i] > maxValue) {
          maxValue = arr[i];
          maxIndex = i;
        }
      }
      return maxIndex;
    }

    const peaksIdx = [];

    for (let i = 0; i < numPeaks; i++) {
      let idx = getMaxIndex(data);
      peaksIdx.push([idx, data[idx]]);
      
      let rangeBegin = idx - windowSize;
      if (rangeBegin < 0) {
        rangeBegin = 0;
      }
      let rangeEnd = idx + windowSize;
      
      for (let j = rangeBegin; j < rangeEnd; j++) {
        data[j] = 0;
      }
    }

    return peaksIdx;
  }
}
