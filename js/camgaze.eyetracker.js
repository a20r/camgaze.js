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
