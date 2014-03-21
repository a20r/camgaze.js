//////////////////////////////////////////////////////////////
//
// This is the camgaze API. Enjoy!
//
// This code is held under a Creative Commons
// Attribution-ShareAlike 3.0 Unported License
//
// name : Alex Wallar
// email : aw204@st-andrews.ac.uk
// github : http://github.com/wallarelvo
//
// Please note:
// -> The words Array and List are used interchangeably
// -> Even though this API is geared towards eye tracking,
//    there are a lot of tools for computer vision that
//    can also be used for other purposes.
//
//////////////////////////////////////////////////////////////

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * /

//////////////////////////////////////////////////////////////
//
// All the namespaces used in the project
//
//////////////////////////////////////////////////////////////

camgaze = {};
camgaze.util = {};
camgaze.structures = {};
camgaze.drawing = {};
camgaze.CVUtil = {};
camgaze.constants = {};
camgaze.cascades = {};

//////////////////////////////////////////////////////////////
//
// Camgaze
//
// Global API for camgaze
//
//////////////////////////////////////////////////////////////

/*
  mCanvasId refers to the canvas that will be drawn on
  at each iteration of the frame operator. If onlyCanvas
  is true, the frame operator will be passed a CanvasDrawer
  and it the return value of the frame operator will not
  be displayed.
*/
camgaze.Camgaze = function (xSize, ySize, mCanvasId, onlyCanvas) {
  if (onlyCanvas == undefined) {
    onlyCanvas = false;
  }

  this.mCanvasId = mCanvasId;
  this.onlyCanvas = onlyCanvas;
  this.xSize = xSize;
  this.ySize = ySize;

  document.getElementById(mCanvasId).height = ySize;
  document.getElementById(mCanvasId).width = xSize;

  this.cam = new camgaze.Camera(
    onlyCanvas ? 640 : xSize,
    onlyCanvas ? 480 : ySize,
    onlyCanvas ? undefined : mCanvasId
  );
  this.video = document.querySelector("video");
}

/*
  Constructs the main loop of the program. The user
  sets the callback function where all of the processing
  happens. The structure of the callback function
  needs to be as follows.

  function callback (
    image_data : ImageData {
      width,
      height,
      data ==> [r, g, b, a, ....]
    },
    video : video {
      src,
      videoHeight,
      videoWidth
    }
  ) --> returns : ImageData ==> image to be displayed

  The return value of the callback function should be the
  ImageData that the user wants to be displayed on the canvas
*/
camgaze.Camgaze.prototype.setFrameOperator = function (callback) {
  var self = this;
  if (this.onlyCanvas == true) {
    var canvasDrawer = new camgaze.drawing.CanvasDrawer(
      this.mCanvasId,
      this.xSize,
      this.ySize
    );
  }
  var frameOp = function () {
    compatibility.requestAnimationFrame(frameOp);
    if (self.cam.videoReady()) {
      var frame = self.cam.getFrame();
      if (self.onlyCanvas) {
        var img = callback(
          frame,
          self.video,
          canvasDrawer
        );
        canvasDrawer.drawAll(false);
      } else {
        var img = callback(frame, self.video);
        if (img.cols != undefined) {
          var img = self.cam.convertToCanvas(frame, img);
        }
        self.cam.drawFrame(img);
      }
    }
  };

  compatibility.requestAnimationFrame(frameOp);
}
//////////////////////////////////////////////////////////////
//
// Camera
//
// Class used to get the raw image from the camera. It parses
// the camera stream into a canvas and returns the ImageData
// associated with it
//
//////////////////////////////////////////////////////////////

/*
  dimX and dimY are the dimensions of the frames
  you would like to be returned from the camera.
*/
camgaze.Camera = function (dimX, dimY, canvasId) {
  if (canvasId != undefined) {
    this.canvas = document.getElementById(canvasId);
    this.canvas.width = dimX;
    this.canvas.height = dimY;
    this.context = this.canvas.getContext('2d');
  }

  this.invisibleCanvas = document.createElement("canvas");
  this.invisibleCanvas.style = "display:none;";
  this.invisibleCanvas.width = dimX;
  this.invisibleCanvas.height = dimY;

  this.invisibleContext = this.invisibleCanvas.getContext('2d');

  this.video = document.querySelector(
    'video'
  );

  var self = this;
  if (compatibility.getUserMedia) {
    compatibility.getUserMedia(
      {
          video : true
        },
        this.showFrame(self),
        this.videoFail
      )
  }
}

camgaze.Camera.prototype = {
  videoReady : function () {
    return this.video.readyState == this.video.HAVE_ENOUGH_DATA;
  },

  // draws the unaugmented frame onto the invisible
  // canvas
  draw : function (video) {
    // draw the video contents into the canvas x, y, width, height
    this.invisibleContext.drawImage(
      video,
      0,
      0,
      this.invisibleCanvas.width,
      this.invisibleCanvas.height
     );
  },

  // automatically called once from the getUserMedia
  showFrame : function (self) {
    return function (localMediaStream) {
      self.video.src = window.URL.createObjectURL(
        localMediaStream
      );
    }
  },

  videoFail : function (e) {
    console.log("VIDEO ERROR:\t", e);
  },

  pauseStreaming : function () {
    this.video.pause();
  },

  playStreaming : function () {
    this.video.play();
  },

  // draws frame onto visible canvas
  drawFrame : function (imgData) {
    //console.log(imgData);
    if (this.context != undefined) {
      this.context.putImageData(
        imgData,
        0, 0
       );
    } else {
      console.log(
        "ERROR:\tCamera settings are only allowing aquisition"
      );
    }
  },

  copyFrame : function (srcImage) {
      var dst = this.invisibleContext.createImageData(
        srcImage.width,
        srcImage.height
      );
      dst.data.set(srcImage.data);
      return dst;
  },

  convertToCanvas : function (imageData, jsFeatData) {
    var image_data = this.copyFrame(imageData);
      var data_u32 = new Uint32Array(image_data.data.buffer);
      var alpha = (0xff << 24);
      var i = jsFeatData.cols * jsFeatData.rows, pix = 0;
      while(--i >= 0) {
          pix = jsFeatData.data[i];
          data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
      }
      return image_data;
  },

  // returns image data
  getFrame : function () {
    this.invisibleContext.drawImage(
      this.video,
      0,
      0,
      this.invisibleCanvas.width,
      this.invisibleCanvas.height
    );
    return this.invisibleContext.getImageData(
      0,
      0,
      this.invisibleCanvas.width,
      this.invisibleCanvas.height
    );
  }
}
//////////////////////////////////////////////////////////////
//
// CVUtil
//
// This namespace is reserved for image processing functions
// that I could not find implemented elsewhere
//
//////////////////////////////////////////////////////////////

// aquires the image moments
camgaze.CVUtil.getMoments = function (contourArray, sizeX, sizeThresh) {
  var blobArray = new Array();
  for (var i = 0; i < contourArray.length; i++) {
    var m00 = contourArray[i].length; // area
    if (m00 > sizeThresh) {
      var m10 = 0;
      var m01 = 0;
      for (var j = 0; j < m00; j++) {
        m10 += (contourArray[i][j] % sizeX);
        m01 += Math.floor(contourArray[i][j] / sizeX);
      }
      blobArray.push(
        new camgaze.structures.Blob(
          new camgaze.structures.Point(
            (m10 / m00).toFixed(0),
            (m01 / m00).toFixed(0)
          ),
          contourArray[i],
          m00
        )
      );
    }
  }
  return blobArray;
}

camgaze.CVUtil.getPixelNeighborhood = function (img, i, j) {
  var retArray = new Array();
  var nps = [
    [-1, -1], [0, -1], [1, -1],
    [-1,  0]//, 		   [1,  0],
    //[-1,  1], [0,  1], [1,  1]
  ];
  for (var k = 0; k < nps.length; k++) {
    pIndex = (j + nps[k][1]) * img.cols + i + nps[k][0];
    if ((i + nps[k][0] < img.cols && i + nps[k][0] >= 0) &&
      (j + nps[k][1] < img.rows && j + nps[k][1] >= 0)) {
      if (img.data[pIndex] > 0) {
        retArray.push(pIndex);
      }
    }
  }
  return retArray;
}

// Takes a one channel, binary image.
camgaze.CVUtil.getConnectedComponents = function (BW, sizeThreshold) {
  var uf = new camgaze.structures.UnionFind();
  var labelImg = jsfeat.cache.get_buffer(BW.cols * BW.rows);
  var maxLabel = -1;
  for (var j = 0; j < BW.rows; j++) {
    for (var i = 0; i < BW.cols; i++) {
      var currentIndex = j * BW.cols + i;

      // discard pixels in the background
      if (BW.data[currentIndex] == 0) {
        continue;
      }

      // gets the neighbouring pixels
      var nps = camgaze.CVUtil.getPixelNeighborhood(
        BW,
        i, j
      );

      // gets all of the already labeled
      // neighbours
      var neighbors = nps.filter(
        function (element, index, array) {
          return labelImg.data[element] != undefined;
        }
      ).map(
        function (element) {
          return labelImg.data[element];
        }
      );

      // if none of the neighbours are labeled
      // label the current index uniquely
      if (neighbors.length == 0) {
        labelImg.data[currentIndex] = maxLabel;
        uf.add(
          maxLabel,
          currentIndex
        );
        maxLabel--;
      } else {
        var minLabel = Math.max.apply(null, neighbors);
        labelImg.data[currentIndex] = minLabel;
        uf.add(
          uf.getLeader(minLabel),
          currentIndex
        );
        for (var k = 0; k < neighbors.length; k++) {
          if (
            !(
              uf.getLeader(neighbors[k]) != undefined &&
              uf.getGroup(neighbors[k]) == undefined
            )
          ) {
            uf.add(uf.getLeader(minLabel), uf.getLeader(neighbors[k]));
          }
        }
      }
    }
  }
  jsfeat.cache.put_buffer(labelImg);
  return camgaze.CVUtil.getMoments(
    uf.getGroupList(),
    BW.cols,
    sizeThreshold
  );
}

camgaze.CVUtil.toGrayscale = function (image_data) {
  var gray_img = new jsfeat.matrix_t(
    image_data.width,
    image_data.height,
    jsfeat.U8_t | jsfeat.C1_t
  );

  jsfeat.imgproc.grayscale(image_data.data, gray_img.data);
  return gray_img;
}

// The image is a single channel, grayscale image
camgaze.CVUtil.grayScaleInRange = function (grayImage, minColor, maxColor) {

  binaryImage = new jsfeat.matrix_t(
    grayImage.cols,
    grayImage.rows,
    jsfeat.U8_t | jsfeat.C1_t
  );

  binaryImage.data.set(grayImage.data)

  for (var i = 0; i < binaryImage.data.length; i++) {
    if (
      binaryImage.data[i] >= minColor &&
      binaryImage.data[i] <= maxColor
    ) {
      binaryImage.data[i] = 255;
    } else {
      binaryImage.data[i] = 0;
    }
  }
  return binaryImage;
}
//////////////////////////////////////////////////////////////
//
// CanvasDrawer
//
// Useful class used to draw on a canvas. It is used when
// a developer does not want to show the image onto the
// canvas in the frame operator. An instance of this object
// gets passed to the frame operator, and shapes can be drawn
// to this object. The function decorator will then call the
// drawAll method and the shapes will be drawn then forgotten
//
//////////////////////////////////////////////////////////////

camgaze.drawing.CanvasDrawer = function (canvasId, xSize, ySize) {
  this.drawingCanvas = document.getElementById(canvasId);
  this.drawingCanvas.width = xSize;
  this.drawingCanvas.height = ySize;

  this.context = this.drawingCanvas.getContext("2d");

  this.xSize = xSize;
  this.ySize = ySize;
  this.drawingObjects = {
    circles : new Array(),
    rectangles : new Array(),
    lines : new Array()
  };
}

camgaze.drawing.CanvasDrawer.prototype = {
  drawLine : function (sPoint, ePoint, lWidth, lColor) {
    this.drawingObjects.lines.push(
      {
        startingPoint : sPoint,
        endingPoint : ePoint,
        lineWidth : lWidth,
        lineColor : lColor
      }
    );
    return this;
  },

  drawCircle : function (cPoint, r, lWidth, clr) {
    this.drawingObjects.circles.push(
      {
        centerPoint : cPoint,
        radius : r,
        lineWidth : lWidth,
        color : clr
      }
    );
    return this;
  },

  drawRectangle : function (tlPoint, w, h, lWidth, clr) {
    this.drawingObjects.rectangles.push(
       {
         topLeftPoint : tlPoint,
         width : w,
         height : h,
         lineWidth : lWidth,
         color : clr
       }
    );
    return this;
  },

  clearCanvas : function () {
    this.context.clearRect(
      0, 0,
      this.drawingCanvas.width,
      this.drawingCanvas.height
    );
  },

  clearAll : function () {
    this.drawingObjects = {
      circles : new Array(),
      rectangles : new Array(),
      lines : new Array()
    };

    return this;
  },

  clearCircles : function () {
    this.drawingObjects.circles = new Array();
    return this;
  },

  clearRectangles : function () {
    this.drawingObjects.rectangles = new Array();
    return this;
  },

  clearLines : function () {
    this.drawingObjects.lines = new Array();
    return this;
  },

  drawAll : function (clearBool) {
    this.clearCanvas();
    this.strokeCircles(false);
    this.strokeRectangles(false);
    this.strokeLines(false);

    if (clearBool == undefined || clearBool) {
      this.clearAll();
      this.clearCanvas();
    }

    return this;
  },

  strokeCircles : function (clearBool) {
    var self = this;
    this.drawingObjects.circles.forEach(
      function (circle) {
        self.context.beginPath();
        self.context.arc(
          circle.centerPoint.x,
          circle.centerPoint.y,
          circle.radius,
          0, 2 * Math.PI,
          false
        );

        if (circle.lineWidth > 0) {
          self.context.lineWidth = circle.lineWidth;
          self.context.strokeStyle = circle.color;
        } else {
          self.context.lineWidth = 0;
          self.context.fillStyle = circle.color;
          self.context.fill();
        }
        self.context.stroke();
      }
    );

    if (clearBool == undefined || clearBool) {
      this.clearCircles();
    }

    return this;
  },

  strokeRectangles : function (clearBool) {
    var self = this;
    this.drawingObjects.rectangles.forEach(
      function (rect) {
        self.context.beginPath();
        self.context.rect(
          rect.topLeftPoint.x,
          rect.topLeftPoint.y,
          rect.width,
          rect.height
        );

        if (circle.lineWidth > 0) {
          self.context.lineWidth = rect.lineWidth;
          self.context.strokeStyle = rect.color;
        } else {
          self.context.lineWidth = 0;
          self.context.fillStyle = rect.color;
          self.context.fill();
        }
        self.context.stroke();
      }
    );

    if (clearBool == undefined || clearBool) {
      this.drawingObjects.rectangles = new Array();
    }

    return this;
  },

  strokeLines : function (clearBool) {
    var self = this;
    this.drawingObjects.lines.forEach(
      function (line) {
        self.context.beginPath();
        self.context.moveTo(
          line.startingPoint.x,
          line.startingPoint.y
        );
        self.context.lineTo(
          line.endingPoint.x,
          line.endingPoint.y
        );

        // sets line properties
        self.context.lineWidth = line.lineWidth;
        self.context.strokeStyle = line.lineColor;
        self.context.lineCap = "round";
        self.context.stroke();
      }
    );

    if (clearBool == undefined || clearBool) {
      this.drawingObjects.lines = new Array();
    }

    return this;
  }
}

//////////////////////////////////////////////////////////////
//
// ImageDrawer
//
// Class used to draw onto images in a canvas. Needs to be
// initialized as an object for memory efficiency. Because
// the HTML5 developers did not provide any tools for drawing
// on images without using a canvas, a new canvas needs to be
// created with the Drawer to allow drawing on an image.
//
// At the moment it only works with ImageData type and not
// jsfeat matrices
//
//////////////////////////////////////////////////////////////

camgaze.drawing.ImageDrawer = function () {
  this.drawingCanvas = document.createElement("canvas");
  this.drawingCanvas.style = "display:none;";
  this.context = this.drawingCanvas.getContext("2d");
}

// line color is hexstring or a well known
// color string
camgaze.drawing.ImageDrawer.prototype = {
  drawLine : function (img, startingPoint, endingPoint, lineWidth, lineColor) {
    this.drawingCanvas.width = img.width;
    this.drawingCanvas.height = img.height;
    this.context.putImageData(
      img,
      0, 0
    );

    this.context.beginPath();
    this.context.moveTo(
      startingPoint.x,
      startingPoint.y
    );
    this.context.lineTo(
      endingPoint.x,
      endingPoint.y
    );

    // sets line properties
    this.context.lineWidth = lineWidth;
    this.context.strokeStyle = lineColor;
    this.context.lineCap = "round";
    this.context.stroke();

    return this.context.getImageData(
      0, 0,
      img.width,
      img.height
    );
  },

  drawCircle : function (img, centerPoint, radius, lineWidth, color) {
    this.drawingCanvas.width = img.width;
    this.drawingCanvas.height = img.height;
    this.context.putImageData(
      img,
      0, 0
    );

    var startAngle = 0;
    var endAngle = 2 * Math.PI;
    var counterClockwise = false;

    this.context.beginPath();
    this.context.arc(
      centerPoint.x,
      centerPoint.y,
      radius,
      startAngle,
      endAngle,
      counterClockwise
    );

    if (lineWidth > 0) {
      this.context.lineWidth = lineWidth;
      this.context.strokeStyle = color;
    } else {
      this.context.lineWidth = 0;
      this.context.fillStyle = color;
      this.context.fill();
    }
    this.context.stroke();

    return this.context.getImageData(
      0, 0,
      img.width,
      img.height
    );
  },

  drawRectangle : function (img, topLeftPoint, width, height, lineWidth, color) {
    this.drawingCanvas.width = img.width;
    this.drawingCanvas.height = img.height;
    this.context.putImageData(
      img,
      0, 0
    );

    this.context.beginPath();
    this.context.rect(
      topLeftPoint.x,
      topLeftPoint.y,
      width,
      height
    );

    if (lineWidth > 0) {
      this.context.lineWidth = lineWidth;
      this.context.strokeStyle = color;
    } else {
      this.context.lineWidth = 0;
      this.context.fillStyle = color;
      this.context.fill();
    }
    this.context.stroke();

    return this.context.getImageData(
      0, 0,
      img.width,
      img.height
    );
  },

  drawFill : function (img, fillIndexes, color) {
    this.drawingCanvas.width = img.width;
    this.drawingCanvas.height = img.height;
    this.context.putImageData(
      img,
      0, 0
    );

    var imgCopy = this.context.getImageData(
      0, 0,
      img.width,
      img.height
    );

    fillIndexes.forEach(
      function (fillIndex) {
        imgCopy.data[4 * fillIndex] = color[0];
        imgCopy.data[4 * fillIndex + 1] = color[1];
        imgCopy.data[4 * fillIndex + 2] = color[2];
      }
    )

    return imgCopy;
  }
}
//////////////////////////////////////////////////////////////
//
// EyeData
//
// Class used to hold data about the eye such as the pupil,
// the bounding Haar rectangle, the unique id, and the max
// and minimum thresholding colors
//
//////////////////////////////////////////////////////////////

camgaze.EyeData = function (eyeRect) {
  this.eyeRect = eyeRect;
  this.pupil = undefined;
  this.image = undefined;
  this.uId = undefined;
  this.maxColor = undefined;
  this.minColor = undefined;
  this.orientation = undefined;
}

camgaze.EyeData.prototype = {
  setId : function (id) {
    this.uId = id;
    return this;
  },

  // pupil is a blob object
  setPupil : function (nPupil) {
    this.pupil = nPupil;
    return this;
  },

    setFace : function (face) {
        this.face = face;
    },

  // image is an ImageData
  setImage : function (image) {
    this.image = image;
    return this;
  },

  setMinMaxColor : function (minColor, maxColor) {
    this.maxColor = maxColor;
    this.minColor = minColor;
    return this;
  },

  /*
    Returns the resultant vector from all of the
    corners to the centroid point.
  */
  getResultantVector : function () {
      return this.getScaledCentroid().sub(
              this.getHaarCentroid()
      ).mult(3);
  },

  getMinMaxColors : function () {
    return new camgaze.structures.Point(
      this.minColor,
      this.maxColor
    );
  },

  getHaarCentroid : function () {
    return new camgaze.structures.Point(
      this.eyeRect.x + this.eyeRect.width / 2,
      this.eyeRect.y + this.eyeRect.height / 2
    );
  },

  getScaledCentroid : function () {
    // kind of cheating here because
    // eyeRect is not a point, but it
    // has an x and y.
    return this.pupil.getCentroid().add(
      this.eyeRect
    );
  },

  getId : function () {
    return this.uId;
  },

  getHaarRectangle : function () {
    return this.eyeRect;
  },

  getPupil : function () {
    return this.pupil;
  },

  getImage : function () {
    return this.image;
  }
}
//////////////////////////////////////////////////////////////
//
// EyeFilter
//
// Class used to filter and normalize the gaze prediction
// to get rid of jitter.
//
//////////////////////////////////////////////////////////////

camgaze.EyeFilter = function () {
  this.movAvgLength = 20;
  this.movAvgDict = {};
  this.MovingAveragePoints = camgaze.structures.MovingAveragePoints;
  this.origin = new camgaze.structures.Point(0, 0);
  this.lookingPointMovAvg = new camgaze.structures.MovingAveragePoints(
    this.origin,
    20
  );
}

camgaze.EyeFilter.prototype = {

  /*
    Returns a dictionary of the current
    moving averages. The structure still
    retains the moving average lists from
    pupils that are present.

    The structure that is returned is:

    {
      id : {
        centroid : MovingAveragePoints(
          length --> this.movAvgLength
        ), // scaled centroids

        resultantVector : MovingAveragePoints(
          length --> this.movAvgLength
        ),

        color : MovingAveragePoints(
          length --> this.movAvgLength
          x --> min color,
          y --> max color
        ),

      }
    }
  */
  updateFilterData : function (td) {
    var self = this;
    var currentDict = {};
    td.getEyeList().forEach(
      function (eye) {
        if (!(eye.getId() in self.movAvgDict)) {
          self.movAvgDict[eye.getId()] = {
            eyeData : eye,

            centroidMA :
              new self.MovingAveragePoints(
                eye.getScaledCentroid(),
                self.movAvgLength
              ),

            resultantVectorMA :
              new self.MovingAveragePoints(
                eye.getResultantVector(),
                self.movAvgLength
              ),

            colorMA :
              new self.MovingAveragePoints(
                eye.getMinMaxColors(),
                self.movAvgLength
              )
          }
        }
        self.updateExistingValue(eye);
        currentDict[eye.getId()] = self.movAvgDict[eye.getId()];
      } // inner func
    ); // for each

    this.lookingPointMovAvg.compound(
      this.getAverageResultantVector(td, false),
      this.origin
    );

    return currentDict;
  },

  updateExistingValue : function (eye) {
    this.movAvgDict[eye.getId()].centroidMA.compound(
      eye.getScaledCentroid(),
      this.origin
    );

    this.movAvgDict[eye.getId()].resultantVectorMA.compound(
      eye.getResultantVector(),
      this.origin
    );

    this.movAvgDict[eye.getId()].colorMA.compound(
      eye.getMinMaxColors(),
      this.origin
    );

    this.movAvgDict[
      eye.getId()
    ].eyeData = eye;
  },

  getAverageLookingPoint : function (td) {
    return this.lookingPointMovAvg.getLastCompoundedResult();
  },

  getAverageResultantVector : function (td, update) {
    if (update == undefined || update) {
      this.updateFilterData(td);
    }
    var avgPoint = new camgaze.structures.Point(0, 0);
    var totalNum = 0;
    var self = this;
    td.getEyeList().forEach(
      function (eye) {
        avgPoint = avgPoint.add(
          self.movAvgDict[
            eye.getId()
          ].resultantVectorMA.getLastCompoundedResult()
        );
        totalNum++;
      }
    );
    return totalNum == 0 ? avgPoint : avgPoint.div(totalNum);
  },

  getFilteredGaze : function (td) {
    var fDict = this.updateFilterData(td);
    var self = this;
    return Object.keys(fDict).map(
      function (key) {
        return {
          centroid : {
            filtered :
              fDict[key].centroidMA.getLastCompoundedResult(),
            unfiltered :
              fDict[key].eyeData.getScaledCentroid()
          },

          eyeData : fDict[key].eyeData,

          gazeVector :
            fDict[key].resultantVectorMA.getLastCompoundedResult(),

          color : {
              min :
                fDict[key].colorMA.getLastCompoundedResult().getX(),
              max :
                fDict[key].colorMA.getLastCompoundedResult().getY()
          }
        };
      }
    );
  }

} // end of EyeFilter prototype

camgaze.LinearCalibrator = function (outXMin, outXMax, outYMin, outYMax, options) {

  this.outXMin = outXMin;
  this.outXMax = outXMax;

  this.outYMin = outYMin;
  this.outYMax = outYMax;

  if (options != undefined) {
    this.topLeft = options.topLeft;
    this.topRight = options.topRight;
    this.bottomLeft = options.bottomLeft;
    this.bottomRight = options.bottomRight;
  }
}

camgaze.LinearCalibrator.prototype = {

  mapVal : function (x, in_min, in_max, out_min, out_max) {
    return (
      (x - in_min) *
      (out_max - out_min) /
      (in_max - in_min) +
      out_min
    );
  },

  setTopLeft : function (topLeft) {
    this.topLeft = topLeft;
    return topLeft;
  },

  setTopRight : function (topRight) {
    this.topRight = topRight;
    return topRight;
  },

  setBottomLeft : function (bottomLeft) {
    this.bottomLeft = bottomLeft;
    return bottomLeft;
  },

  setBottomRight : function (bottomRight) {
    this.bottomRight = bottomRight;
    return bottomRight;
  },

  allDefined : function () {
    return (
      this.topLeft != undefined &&
      this.topRight != undefined &&
      this.bottomLeft != undefined &&
      this.bottomRight != undefined
    );
  },

  getMappedPoint : function (unMappedPoint) {
    return new camgaze.structures.Point(
      this.mapVal(
        unMappedPoint.x,
        this.topLeft.x - 10,
        this.topRight.x + 10,
        this.outXMin,
        this.outXMax
      ).toFixed(0),
      this.mapVal(
        unMappedPoint.y,
        this.topLeft.y - 10,
        this.bottomLeft.y + 10,
        this.outYMin,
        this.outYMax
      ).toFixed(0)
    );
  }
}
//////////////////////////////////////////////////////////////
//
// EyeTracker
//
// This class is used for eye tracking and gaze prediction.
// It works by finding the eye using HaarDetector with an
// eye cascade, then thresholding the grayscale image such
// that the probability that a pupil has been found is
// maximized. Then the algorithm uses the corners of the
// bounding Haar rectangles to get the resultant gaze
// vector without calibration.
//
//////////////////////////////////////////////////////////////

/*
  xSize and ySize are the sizes of the image
  that is expected by EyeTracker. It is used
  mainly for memory efficiency and the reuse
  of variables in the HaarDetector
*/
camgaze.EyeTracker = function (xSize, ySize) {

  this.xSize = xSize;
  this.ySize = ySize;

  this.haarDetector = new camgaze.CVUtil.HaarDetector(
    camgaze.cascades.eye,
    this.xSize,
    this.ySize
  );

  // need to figure out this value
  // probably way to big right now
  this.averageContourSize = 200;

  this.MAX_COLOR = 30;
  this.MIN_COLOR = 10;

  this.previousEyes = new Array();
  this.lostEyes = new camgaze.structures.Set(
    camgaze.util.eyeHashFunc
  );

  this.resizeCanvas = document.createElement("canvas");
  this.resizeCanvas.style = "display:none;";
  this.resizeCtx = this.resizeCanvas.getContext("2d");
}

camgaze.EyeTracker.prototype = {

  // gets the angle between two points
  getAngle : function (P1, P2) {
    var deltaY = Math.abs(P2[1] - P1[1]);
    var deltaX = Math.abs(P2[0] - P1[0]);
    var angleInDegrees = Math.atan(
      deltaY / deltaX
    ) * 180 / Math.PI;

    return angleInDegrees;
  },

  /*
    Takes a list not a blob! Point is the
    blob centroid that is presumed to be the
    pupil. This function helps check how
    in the center the pupil is. This can
    help weed out incorrectly classified
    pupils.

    width and height are needed so the corners
    can be deduced. The point is referenced from
    the scope of the inner image, so the width
    and height are needed to get the angle
    deviations
  */
  getAverageAngleDeviation : function (point, width, height) {

    var cornerList = [
      [
        0, 0
      ],
      [
        width, 0
      ],
      [
        0, height
      ],
      [
        width,
        height
      ]
    ];

    var self = this;
    var deviationList = cornerList.map(
      function (corner) {
        return Math.abs(
          45 - self.getAngle(point.toList(), corner)
        );
      }
    );
    return deviationList.mean();
  },

  // possible pupil is a Blob
  weightPupil : function (possiblePupil, width, height) {
    var angleDev = Math.abs(
      this.getAverageAngleDeviation(
        possiblePupil.getCentroid(),
        width, height
      )
    );

    var sizeDev = Math.abs(
      possiblePupil.getContourArea() -
      this.averageContourSize
    );

    var sizePercentError = 100 * sizeDev / this.averageContourSize;
    var anglePercentError = 100 * angleDev / 45;
    var averagePercentError = (
      sizePercentError + anglePercentError
    ) / 2;

    return averagePercentError;
  },

  /*
    Returns the best waited pupil in a sub ROI
    image. The ROI of the img is the bounding
    rectangle given by the HaarDetector.
  */
  getPupil : function (img) {
    var possiblePupils = new Array();
    var step = 5;

    /*
      Thresholds the image with different
      minimum and maximum color values
      within a range defined in the
      constructor. Saves the possible pupils
      in an array. Then the array is reduced
      by getting the minimum weight from
      the weightPupil function.
    */
    for (
        var minColor = this.MIN_COLOR;
        minColor < this.MAX_COLOR - step;
        minColor += step
    ) {
      for (
          var maxColor = minColor + step;
          maxColor < this.MAX_COLOR;
          maxColor += step
      ) {
        var pPupils = this.getUnfilteredPupils(
          img,
          minColor,
          maxColor
        );
        if (pPupils != undefined) {
          possiblePupils = possiblePupils.concat(
            pPupils.map(
              function (pPupil) {
                return {
                  pupil : pPupil,
                  maxColor : maxColor,
                  minColor : minColor
                };
              }
            )
          );
        } // if
      } // inner for
    } // outer for

    if (possiblePupils.length == 0) {
      return undefined;
    }

    var self = this;
    return possiblePupils.reduce(
      function (p1, p2) {
        if (self.weightPupil(p1.pupil, img.width, img.height) <
          self.weightPupil(p2.pupil, img.width, img.height)) {
          return p1;
        } else {
          return p2;
        }
      }
    );
  },

  getUnfilteredPupils : function (img, minColor, maxColor) {
    var imgGray = camgaze.CVUtil.toGrayscale(img);
    var pupilBW = camgaze.CVUtil.grayScaleInRange(
      imgGray,
      minColor,
      maxColor
    );
    //console.log(pupilBW);
    var pupilBList = camgaze.CVUtil.getConnectedComponents(
      pupilBW,
      1
    );

    if (pupilBList.length == 0) {
      return undefined;
    }

    return pupilBList;
  },

  getRectSizes : function (rects) {
    return rects.map(
      function (rect) {
        return rect.width * rect.height;
      }
    );
  },

  /*
    Equalizes the rectangle sizes and gets rid
    of rectangles that are too close together.
  */
  filterRects : function (rects, distanceThresh) {
    if (rects.length == 0) {
      return new Array();
    }

    var W, H;
    var minRectSize = Math.min.apply(
      null,
      this.getRectSizes(rects)
    );

    for (var i = 0; i < rects.length; i++) {
      if (rects[i].width *
        rects[i].height == minRectSize) {
        W = rects[i].width;
        H = rects[i].height;
        break;
      }
    }

    var equalizedRects =  rects.map(
      function (rect) {
        return {
          x : rect.x + (rect.width / 2) - (W / 2),
          y : rect.y + (rect.height / 2) - (H / 2),
          width : W,
          height : H,
          confidence : rect.confidence
        };
      }
    );

    jsfeat.math.qsort(
      equalizedRects,
      0, rects.length - 1,
      function (a, b) {
        return b.confidence < a.confidence;
      }
    );

    var retRects = new Array();
    equalizedRects.forEach(
      function (rect) {
        var rectNotTooClose = retRects.every(
          function (rRect) {
            var p = new camgaze.structures.Point(
              rRect.x, rRect.y
            );
            return p.distTo(rect) > distanceThresh;
          }
        );

        if (rectNotTooClose) {
          retRects.push(rect);
        }
      }
    );

    return retRects;
  },

  track : function (imageData, video) {
    var trackingData = new camgaze.TrackingData();
    trackingData.setImage(imageData);

    var unfilteredEyeRects = this.haarDetector.detectObjects(
      video,
      2.4, // scale factor
      1 // min scale
    );

    var eyeRects = this.filterRects(
      unfilteredEyeRects,
      20 // distance threshold
    );

    // gets the video frame
    this.resizeCanvas.width = video.videoWidth;
    this.resizeCanvas.height = video.videoHeight;
    this.resizeCtx.drawImage(
      video,
      0,
      0,
      video.videoWidth,
      video.videoHeight
    );

    var self = this;
    eyeRects.forEach(
      function (rect) {
        if (Math.abs(rect.confidence) > 0) {
          var eyeData = new camgaze.EyeData(rect);

          // needs to use another canvas because
          // stupid html5....
          var eyeImg = self.resizeCtx.getImageData(
            rect.x,
            rect.y,
            rect.width,
            rect.height
          );
          eyeData.setImage(eyeImg);

          var pupilObj = self.getPupil(eyeImg);
          if (pupilObj != undefined) {
            var pupil = pupilObj.pupil;
            var maxColor = pupilObj.maxColor;
            var minColor = pupilObj.minColor;
            eyeData.setPupil(pupil);
            eyeData.setMinMaxColor(minColor, maxColor);
            trackingData.pushEye(eyeData);
          }
        }
      }
    );

    this.lostEyes.updateWithList(
      trackingData.assignIds(
        this.previousEyes
      ).toList()
    );
    this.previousEyes = trackingData.getEyeList().concat(
      this.lostEyes.toList()
    );

    return trackingData;
  }

}
//////////////////////////////////////////////////////////////
//
// HaarDetector
//
// This is a class for detecting Haar like objects using
// a trained Haar classifier written in Javascript.
//
//////////////////////////////////////////////////////////////

camgaze.CVUtil.HaarDetector = function (classifier, imageWidth, imageHeight) {

  this.classifier = classifier;

  // This number is a result of
  // unicorn magic. Play with it
  // if you please.
  var max_work_size = 200;

  var scale = Math.min(
    max_work_size / imageWidth,
    max_work_size / imageHeight
  );

  this.imageWidth = imageWidth;
  this.imageHeight = imageHeight;

  w = (imageWidth * scale) | 0;
  h = (imageHeight * scale) | 0;

  // this canvas is needed for the resizing of the image
  // i.e. the HTML5 developers got lazy
  var work_canvas = document.createElement("canvas");
  work_canvas.style = "display:none;"
  work_canvas.width = w;
  work_canvas.height = h;
  this.ctx = work_canvas.getContext("2d");


  this.img_u8 = new jsfeat.matrix_t(
    w, h,
    jsfeat.U8_t | jsfeat.C1_t
  );
  this.ii_sum = new Int32Array(
    (w + 1) * (h + 1)
  );
  this.ii_sqsum = new Int32Array(
    (w + 1) * (h + 1)
  );
  this.ii_tilted = new Int32Array(
    (w + 1) * (h + 1)
  );
  this.w = w;
  this.h = h;
}

// detects objects based on the classifier
camgaze.CVUtil.HaarDetector.prototype = {
  detectObjects : function (video, scaleFactor, minScale) {
    this.ctx.drawImage(video, 0, 0, this.w, this.h);
    var imageData = this.ctx.getImageData(
      0, 0,
      this.w, this.h
    );
    //console.log(imageData);

    jsfeat.imgproc.grayscale(
      imageData.data,
      this.img_u8.data
    );

    jsfeat.imgproc.equalize_histogram(
      this.img_u8,
      this.img_u8
    );
    //jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3);

    // gets the integral image
    jsfeat.imgproc.compute_integral_image(
      this.img_u8,
      this.ii_sum,
      this.ii_sqsum,
      this.classifier.tilted ? ii_tilted : null
    );

    jsfeat.haar.edges_density = 0.13;

    // finally detects the objects
    var rects = jsfeat.haar.detect_multi_scale(
      this.ii_sum,
      this.ii_sqsum,
      this.ii_tilted,
      null,
      this.img_u8.cols,
      this.img_u8.rows,
      this.classifier,
      scaleFactor,
      minScale
    );
    rects = jsfeat.haar.group_rectangles(rects, 1);
    return this.scaleRectangles(
      rects,
      this.imageWidth / this.img_u8.cols
    );
  },

  // scales the rectangles back up
  scaleRectangles : function (rects, sc) {
    var rectArray = new Array(rects.length);
    for (var i = 0; i < rects.length; i++) {
      rectArray[i] = {
        x: sc * rects[i].x,
        y: sc * rects[i].y,
        width: sc * rects[i].width,
        height: sc * rects[i].height,
        confidence : rects[i].confidence
      };
    }
    return rectArray;
  }
}
//////////////////////////////////////////////////////////////
//
// UnionFind
//
// UnionFind data structure used to store neighbor
// equivalence when dealing with connected components
//
//////////////////////////////////////////////////////////////

camgaze.structures.UnionFind = function () {
  this.leader = {};
  this.group = {};
}

camgaze.structures.UnionFind.prototype = {

  add : function (a, b) {
    //"use strict";
    if (b == undefined) {
      if (this.leader[a] == undefined) {
        this.leader[a] = a;
        this.group[a] = new Array();
        this.group[a].push(a)
      }
      return;
    }
    var leadera = this.leader[a];
    var leaderb = this.leader[b];
    if (leadera != undefined) {
      if (leaderb != undefined) {
        if (leadera == leaderb)  {
          return;
        }
        var groupa = this.group[this.leader[leadera]];
        var groupb = this.group[this.leader[leaderb]];
        this.leader[b] = leadera;

        $.merge(groupa, groupb);
        delete this.group[leaderb];
        for (var i = 0; i < groupb.length; i++) {
          this.leader[i] = leadera;
        }
      } else {
        //if (this.group[leadera] == undefined) {
          //this.group[leadera] = new Array();
        //}
        if (this.group[leadera] == undefined) {
          this.group[this.leader[leadera]].push(b);
        } else {
          this.group[leadera].push(b);
        }
        this.leader[b] = leadera;
      }
    } else {
      if (leaderb != undefined) {
        //if (this.group[leaderb] == undefined) {
          //this.group[leaderb] = new Array();
        //}
        this.group[leaderb].push(a);
        this.leader[a] = leaderb;
      } else {
        this.leader[a] = this.leader[b] = a;
        this.group[a] = [b];
      }
    }
  },

  getLeaders : function () {
    return this.leader;
  },

  getLeader : function (i) {
    return this.leader[i];
  },

  getGroups : function () {
    return this.group;
  },

  getGroup : function (i) {
    return this.group[i];
  },

  getGroupList : function () {
    var retArray = new Array();
    for (var k in this.group) {
      retArray.push(this.group[k]);
    }
    return retArray;
  }
}

//////////////////////////////////////////////////////////////
//
// Point
//
// Object used to represent a point. Used throughout the
// project.
//
//////////////////////////////////////////////////////////////

camgaze.structures.Point = function (x, y) {
  this.x = x;
  this.y = y;
}

camgaze.structures.Point.prototype = {

  getX : function () {
    return parseInt(this.x);
  },

  getY : function () {
    return parseInt(this.y);
  },

  toList : function () {
    return [parseInt(this.x), parseInt(this.y)];
  },

  mult : function (number) {
    return new camgaze.structures.Point(
      parseInt(this.x) * number,
      parseInt(this.y) * number
    );
  },

  add : function (otherPoint) {
    return new camgaze.structures.Point(
      parseInt(this.x) + parseInt(otherPoint.x),
      parseInt(this.y) + parseInt(otherPoint.y)
    );
  },

  sub : function (otherPoint) {
    return new camgaze.structures.Point(
      parseInt(this.x) - parseInt(otherPoint.x),
      parseInt(this.y) - parseInt(otherPoint.y)
    );
  },

  div : function (number) {
    return new camgaze.structures.Point(
      parseInt(parseInt(this.x) / number),
      parseInt(parseInt(this.y) / number)
    );
  },

  // returns the distance to another point
  distTo : function (otherPoint) {
    return Math.sqrt(
      Math.pow(parseInt(this.x) - parseFloat(otherPoint.x), 2) +
      Math.pow(parseInt(this.y) - parseFloat(otherPoint.y), 2)
    )
  },

  getVal : function (ind) {
    if (ind == 0) {
      return x;
    } else if (ind == 1) {
      return y;
    } else {
      return undefined;
    }
  }
}

//////////////////////////////////////////////////////////////
//
// Blob
//
// Object used to represent a blob. Holds information
// relative to a binary blob such as the contour and the
// centroid
//
//////////////////////////////////////////////////////////////

camgaze.structures.Blob = function (centroid, contour, contourArea) {
  this.centroid = centroid
  this.contour = contour
  this.contourArea = contourArea
}

camgaze.structures.Blob.prototype = {
  getCentroid : function () {
    return this.centroid;
  },

  getContour : function () {
    return this.contour;
  },

  getContourArea : function () {
    return this.contourArea;
  }
}

//////////////////////////////////////////////////////////////
//
// Set
//
// A simple set structure that only has unique objects. This
// means that the structure does not contain duplicates.
// Duplicates are weeded out by passing a function into the
// constructor that returns the unique hash of the object.
//
// hashFunc structuring:
// function hashFunc(obj : Object) --> String
//
//////////////////////////////////////////////////////////////

camgaze.structures.Set = function (hashFunc, arrayToConvert) {
  if (arrayToConvert != undefined) {
    var set = new Object();
    arrayToConvert.forEach(
      function (val) {
        if (!(hashFunc(val) in set)) {
          set[hashFunc(val)] = val;
        }
      }
    );
    this.set = set;
    this.hashFunc = hashFunc;
  } else {
    this.set = new Object();
    this.hashFunc = hashFunc;
  }
}

camgaze.structures.Set.prototype = {

  // puts a value into the set, if
  // the value is already there, it
  // does not update the value.
  put : function (val) {
    if (!(this.hashFunc(val) in this.set)) {
      this.set[camgaze.util.eyeHashFunc(val)] = val;
    }
    return this;
  },

  // updates the value inside the set.
  // If the value is not in the set,
  // it puts it into the set.
  update : function (val) {
    this.set[camgaze.util.eyeHashFunc(val)] = val;
  },

  updateWithList : function (valList) {
    var self = this;
    valList.forEach(
      function (val) {
        self.set[camgaze.util.eyeHashFunc(val)] = val;
      }
    );
  },

  // gets a value from the set
  get : function (hashVal) {
    return this.set[hashVal];
  },

  // gets the set difference. For the
  // return set, the hash function used
  // is the the one from the set you are
  // calling difference from
  difference : function (otherSet) {
    var retSet = new camgaze.structures.Set(this.hashFunc);
    for (var key in this.set) {
      if (!(key in otherSet.set)) {
        retSet.update(this.set[key]);
      }
    }
    return retSet;
  },

  toList : function () {
    var retList = new Array();
    for (var key in this.set) {
      retList.push(this.set[key]);
    }
    return retList;
  }
}

//////////////////////////////////////////////////////////////
//
// MovingAveragePoints
//
// Implementation of a dynamic, moving average list. Elements
// are pushed to the list, but the list remains the same size
// by removing one element. The compounded value is the mean
// of the list. This is used to reduce jitter in data with a
// lot of noise
//
//////////////////////////////////////////////////////////////

camgaze.structures.MovingAveragePoints = function (startingValue, length) {
  this.movAvgList = new Array(length);
  this.lastMean = undefined;
  for (var i = 0; i < length; i++) {
    this.movAvgList[i] = startingValue;
  }
}

camgaze.structures.MovingAveragePoints.prototype = {
  getLength : function () {
    return this.movAvgList.length;
  },

  put : function (value) {
    this.movAvgList.shift(1);
    this.movAvgList.push(value);
    return this;
  },

  removeOutliers : function (maList, refPoint) {
    var acceptableStds = 3.5;
    var distList = maList.map(
      function (point) {
        return point.distTo(refPoint);
      }
    );

    var meanVal = 0;
    for (var i = 0; i < distList.length; i++) {
      meanVal += (distList[i] / maList.length);
    }

    var variance = 0;
    for (var i = 0; i < distList.length; i++) {
      variance += (
        Math.pow(distList[i] - meanVal, 2) /
        distList.length
      );
    }

    var std = Math.sqrt(variance);

    return maList.filter(
      function (point, index, array) {
        return distList[index] < (meanVal + acceptableStds * std);
      }
    );
  },

  getMean : function (maList) {
    if (maList.length == 0) {
      maList = this.movAvgList;
    }

    var divList = maList.map(
      function (point) {
        return new camgaze.structures.Point(
          point.x / maList.length,
          point.y / maList.length
        )
      }
    )

    var retVal = divList.reduce(
      function (prevPoint, curPoint) {
        return new camgaze.structures.Point(
          prevPoint.x + curPoint.x,
          prevPoint.y + curPoint.y
        )
      }
    )

    return new camgaze.structures.Point(
      retVal.x.toFixed(0),
      retVal.y.toFixed(0)
    )
  },

  compound : function (value, refPoint) {
    this.put(value);
    var maListCopy = this.movAvgList.slice(0);
    this.lastMean = this.getMean(
      //this.removeOutliers(maListCopy, refPoint)
      maListCopy
    );
    return this.lastMean;
  },

  setLength : function (length) {
    if (length < this.movAvgList.length) {
      this.movAvgList = this.movAvgList.slice(
        this.movAvgList.length - nlength,
        this.movAvgList.length
      );
    } else if (length > this.movAvgList.length) {
      var lPoint = this.movAvgList[this.movAvgList.length];
      for (var i = 0; i < length - this.movAvgList.length; i++) {
        this.movAvgList.push(lPoint);
      }
    }
    return this;
  },

  getLastCompoundedResult : function () {
    return this.lastMean;
  }
}
//////////////////////////////////////////////////////////////
//
// TrackingData
//
// A class that holds the global tracking statistics such as
// the list of eyes and the image associated with it.
//
//////////////////////////////////////////////////////////////

camgaze.TrackingData = function () {
  this.image = undefined;
  this.eyeList = new Array();
  this.idMap = new Object();
}

camgaze.TrackingData.prototype = {

  /*
    Assigns unique identifiers to the eyes
    so you can track them from frame to frame.
    Used for calibration and filtering Returns
    the eyes that are no longer in the frame.
    Takes a list of eyes from the last frame
    and the lost eyes.

    prevEyes is an array
  */
  assignIds : function (prevEyes) {
    if (this.eyeList.length == 0) {
      return new camgaze.structures.Set(camgaze.util.eyeHashFunc);
    }

    if (prevEyes.length == 0) {
      for (var i = 0; i < this.eyeList.length; i++) {
        var eyeId = this.getGUID();
        this.idMap[eyeId] = this.eyeList[i];
        this.eyeList[i].setId(eyeId);
        return new camgaze.structures.Set(camgaze.util.eyeHashFunc);
      }
    } else {
      /*
        List of lists containing an enumeration
        of the distance from a previously detected
        eye to a current eye.

        distList --> [
          [
            [0, distance from 0th previous eye to the 0th eye],
            [1, distance from 1st previous eye to the 0th eye],
            ...
          ],
          ...
        ]
      */
      var distList = this.eyeList.map(
        function (eye) {
          return prevEyes.map(
            function (pEye, index) {
              return [
                index,
                eye.getScaledCentroid().distTo(
                  pEye.getScaledCentroid()
                )
              ];
            }
          );
        }
      );

      /*
        Gets the index smallest distance
        from each of the previous eyes
        to a current eye
      */
      var minDistList = distList.map(
        function (ds) {
          return ds.reduce(
            function (a, b) {
              if (a[1] < b[1]) {
                return a;
              } else {
                return b;
              }
            }
          )
        }
      ).map(
        function (val) {
          return val[0];
        }
      );

      /*
        usedPreviousEyes is filled with
        indexes eyes that have been
        matched up with a previous eye
        this ensures one eye does not get
        mapped to multiple previous eyes
      */
      var usedPreviousEyes = new Array();
      var self = this;

      minDistList.forEach(
        function (j, i) {
          if (self.eyeList[i].getId() == undefined &&
            !(j in usedPreviousEyes)) {
            self.eyeList[i].setId(prevEyes[j].getId());
            self.idMap[prevEyes[j].getId()] = self.eyeList[i];
            usedPreviousEyes.push(j);
          }
        }
      );

      for (var i = 0; i < minDistList.length; i++) {
        if (this.eyeList[i].getId() == undefined) {
          eyeId = this.getGUID();
          this.eyeList[i].setId(eyeId);
          this.idMap[eyeId] = this.eyeList[i];
        }
      }

      var prevEyesSet = new camgaze.structures.Set(
        camgaze.util.eyeHashFunc,
        prevEyes
      );

      var usedEyeSet = new camgaze.structures.Set(
        camgaze.util.eyeHashFunc
      );

      usedPreviousEyes.forEach(
        function (usedIndex) {
          usedEyeSet.put(prevEyes[usedIndex]);
        }
      );

      return prevEyesSet.difference(usedEyeSet);
    }
  },

  pushEye : function (eye) {
    this.eyeList.push(eye);
    return this;
  },

  setImage : function (image) {
    this.image = image;
    return this;
  },

  getImage : function () {
    return this.image;
  },

  getEye : function (index) {
    return this.eyeList[index];
  },

  getEyeList : function () {
    return this.eyeList;
  },

  getLength : function () {
    return this.eyeList.length;
  },

  map : function (mapFunc) {
    return this.eyeList.map(mapFunc);
  },

  forEach : function (forEachFunc) {
    this.eyeList.forEach(forEachFunc);
  },

  _s4 : function () {
    return Math.floor(
      (1 + Math.random()) * 0x10000
    ).toString(16).substring(1);
  },

  getGUID : function () {
    return (
      this._s4() + this._s4() + '-' +
      this._s4() + '-' + this._s4() + '-' +
      this._s4() + '-' + this._s4() +
      this._s4() + this._s4()
      );
  }
}
//////////////////////////////////////////////////////////////
//
// util
//
// Utility functions used by most classes. Functions that
// have nowhere else to go...
//
// Also, here is where I extend other prototypes.
//
//////////////////////////////////////////////////////////////

camgaze.util.eyeHashFunc = function (eye) {
  return eye.getId();
}

Array.prototype.mean = function () {
  var sum = this.reduce(
    function (prev, cur) {
      return prev + cur;
    }
  );

  return sum / this.length;
}
