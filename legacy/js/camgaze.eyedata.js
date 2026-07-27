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
