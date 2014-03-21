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
