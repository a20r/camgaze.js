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
