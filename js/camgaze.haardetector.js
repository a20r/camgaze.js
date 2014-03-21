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
