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
