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
