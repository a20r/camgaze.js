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
