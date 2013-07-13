

//////////////////////////////////////////////////////////////
//
// This is the camgaze API. Enjoy!
// 
// This code is held under a Creative Commons 
// Attribution-ShareAlike 3.0 Unported License
//
// name : Alex Wallar
// email : aw204@st-andrews.ac.uk
//
//////////////////////////////////////////////////////////////

var cam = undefined;
var contourArray;
window.onload = function () {
	cam = new camgaze.Camera (
		"mainCanvas", 
		"invisibleCanvas",
		640, 480, 
		10
	);
	setInterval(
		function () {
			var image_data = cam.getFrame()
			var gray_img = camgaze.CVUtil.toGrayscale(image_data);
			var binary_img = camgaze.CVUtil.grayScaleInRange(gray_img, 12, 26);
			contourArray = camgaze.CVUtil.getContours(binary_img);
			var drawingImage = cam.convertToCanvas(image_data, binary_img);
			cam.drawFrame(drawingImage);
			//cam.drawFrame(image_data);
		},
		cam.frameWaitTime
	);
}

// namespace
camgaze = {}

//////////////////////////////////////////////////////////////
//
// This namespace is reserved for image processing functions
// that I could not find implemented elsewhere
//
//////////////////////////////////////////////////////////////

camgaze.CVUtil = {};

camgaze.CVUtil.getMoments = function (contour) {

}

"""
# Total shit
camgaze.CVUtil.getPixelNeighborhood = function (img, i, j) {
	var retArray = new Array();
	var nps = [
		[-1, -1], [0, -1], [1, -1],
		[-1,  0],          [1,  0],
		[-1,  1], [0,  1], [1,  1],
	];
	for (var k = 0; k < nps.length; k++) {
		pIndex = (j + nps[k][1]) * img.rows + i + nps[k][0];
		if ((i + nps[k][0] < img.cols || i + nps[k][0] >= 0) &&
			(j + nps[k][1] < img.rows || j + nps[k][1] >= 0)) {
			retArray.push(pIndex);
		}
	}
	return retArray;
}

// Takes a one channel, binary image.
camgaze.CVUtil.getContours = function (BW) {
	var labelArray = {};
	var maxLabel = 0;
	var contourArray = new Array();
	var nps, nLabels;
	for (var j = 0; j < BW.rows; j++) {
		for (var i = 0; i < BW.cols; i++) {

			// if not inside a blob, continue
			if (BW.data[j * BW.rows + i] == 0) {
				continue;
			}

			nps = camgaze.CVUtil.getPixelNeighborhood(
				BW, i, j
			);
			nLabels = new Array();

			// counts the occurence of each label
			// of the neighbors to best fit the 
			// new point
			for (var k = 0; k < nps.length; k++) {
				if (labelArray[nps[k]] != undefined) {
					if (nLabels[labelArray[nps[k]]] == undefined) {
						nLabels[labelArray[nps[k]]] = 0;
					} else {
						nLabels[labelArray[nps[k]]]++;
					}
				}
			}

			// adding a new label
			if (nLabels.length == 0) {
				labelArray[j * BW.rows + i] = maxLabel;
				contourArray[maxLabel] = new Array();
				contourArray[maxLabel].push([i, j]);
				maxLabel++;
			} else {

				// gets the maximum value in the array
				var maxCount = nLabels.reduce(
					function (prevElem, curElem, index, array) {
						if (curElem == undefined && prevElem == undefined) {
							return 0;
						} else if (prevElem == undefined) {
							return curElem;
						} else if (curElem == undefined) {
							return prevElem;
						}
						if (curElem > prevElem) {
							return curElem;
						} else {
							return prevElem;
						}
					}
				);

				// finds the index of the maximum value
				var maxIndex;
				for (var k = 0; k < nLabels.length; k++) {
					if (nLabels[k] == maxCount) {
						maxIndex = k;
						break;
					}		
				}
				labelArray[j * BW.rows + i] = maxIndex;
				contourArray[maxIndex].push([i, j]);
			}
		}
	}
	return contourArray;
}
"""

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
// Object used to represent a point. Used throughout the 
// project. 
//
//////////////////////////////////////////////////////////////

camgaze.Point = function (x, y) {
	this.x = x;
	this.y = y;
}

camgaze.Point.prototype.toList = function () {
	return [this.x, this.y];
}

camgaze.Point.prototype.add = function (otherPoint) {
	return new camgaze.Point(
		this.x + otherPoint.x, 
		this.y + otherPoint.y
	);
}

camgaze.Point.prototype.sub = function (otherPoint) {
	return new camgaze.Point(
		this.x - otherPoint.x, 
		this.y - otherPoint.y
	);
}

camgaze.Point.prototype.distTo = function (otherPoint) {
	return Math.sqrt(
		Math.pow(this.x - otherPoint.x, 2) + 
		Math.pow(this.y - otherPoint.y, 2)
	)
}

camgaze.Point.prototype.getVal = function (ind) {
	if (ind == 0) {
		return x;
	} else if (ind == 1) {
		return y;
	} else {
		return undefined;
	}
}

//////////////////////////////////////////////////////////////
//
// Object used to represent a blob. Holds information 
// relative to a binary blob such as the contour and the
// centroid
//
//////////////////////////////////////////////////////////////

camgaze.Blob = function (centroid, contour, contourArea) {
	this.centroid = centroid
	this.convexHull = convexHull
	this.contour = contour
	this.convexHullArea = convexHullArea
	this.contourArea = contourArea
}

camgaze.Blob.prototype.getCentroid = function () {
	return new camgaze.Point(
		this.centroid[0], 
		this.centroid[1]
	)
}

camgaze.Blob.prototype.getContour = function () {
	return this.contour;
}

camgaze.Blob.prototype.getContourArea = function () {
	return this.contourArea;
}

//////////////////////////////////////////////////////////////
//
// Implementation of a dynamic, moving average list. Elements 
// are pushed to the list, but the list remains the same size 
// by removing one element. The compounded value is the mean 
// of the list. This is used to reduce jitter in data with a 
// lot of noise
//
//////////////////////////////////////////////////////////////

camgaze.MovingAveragePoints = function (startingValue, length) {
	this.movAvgList = new Array(length);
	this.lastMean = undefined;
	for (var i = 0; i < length; i++) {
		this.movAvgList[i] = startingValue;
	}
}

camgaze.MovingAveragePoints.prototype.getLength = function () {
	return this.movAvgList.length;
}

camgaze.MovingAveragePoints.prototype.put = function (value) {
	this.movAvgList.shift(1);
	this.movAvgList.push(value);
	return this;
}

camgaze.MovingAveragePoints.prototype.removeOutliers = function (maList, refPoint) {
	var acceptableStds = 3;
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
			return distList[index] < (meanDist + acceptableStds * std);
		}
	);
}

camgaze.MovingAveragePoints.prototype.getMean = function (maList) {
	if (maList.length == 0) {
		maList = this.movAvgList;
	}

	var divList = maList.map(
		function (point) {
			return new camgaze.Point(
				point.x / maList.length,
				point.y / maList.length
			)
		}
	)

	var retVal = divList.reduce(
		function (prevPoint, curPoint) {
			return new camgaze.Point(
				prevPoint.x + curPoint.x,
				prevPoint.y + curPoint.y
			)
		}
	)

	return new camgaze.Point(
		retVal.x.toFixed(0), 
		retVal.y.toFixed(0)
	)
}

camgaze.MovingAveragePoints.prototype.compound = function (value, refPoint) {
	this.put(value);
	var maListCopy = this.movAvgList.slice(0);
	this.lastMean = this.getMean(
		this.removeOutliers(maListCopy, refPoint)
	);
	return this.lastMean;
}

camgaze.MovingAveragePoints.prototype.setLength = function (length) {
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
}

camgaze.MovingAveragePoints.prototype.getLastCompoundedResult = function () {
	return this.lastMean;
}

//////////////////////////////////////////////////////////////
//
// Class used to get the raw image from the camera. It parses
// the camera stream into a canvas and returns the ImageData
// associated with it
//
//////////////////////////////////////////////////////////////

camgaze.Camera = function (canvasId, invisibleCanvasId, dimX, dimY, frameWaitTime) {
	this.canvas = document.getElementById(canvasId);
	this.canvas.width = dimX;
	this.canvas.height = dimY;

	this.invisibleCanvas = document.getElementById(
		invisibleCanvasId
	);
	this.invisibleCanvas.width = dimX;
	this.invisibleCanvas.height = dimY;
	this.frameWaitTime = frameWaitTime;

	this.context = this.canvas.getContext('2d');
	this.invisibleContext = this.invisibleCanvas.getContext('2d');

	this.videoInterval = undefined

	var self = this;
	if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia(
			{
	    		video : true
	    	},
	    	this.showFrame(self),
	    	this.videoFail
	  	)
	}
}

// draws the unaugmented frame onto the invisible
// canvas
camgaze.Camera.prototype.draw = function (video) {
	// draw the video contents into the canvas x, y, width, height
	this.invisibleContext.drawImage(
		video,
		0,
		0,
		this.invisibleCanvas.width,
		this.invisibleCanvas.height
   );
}

// automatically called once from the getUserMedia
camgaze.Camera.prototype.showFrame = function (self) {
	return function (localMediaStream) {
		var video = document.querySelector(
		  'video'
		);

		video.src = window.URL.createObjectURL(
			localMediaStream
		);

		self.videoInterval = setInterval(
			function () {
				self.draw(video);
			}, 
			self.frameWaitTime
		);
	}
}

camgaze.Camera.prototype.videoFail = function (e) {
	console.log("ERROR:\t", e);
}

camgaze.Camera.prototype.pauseStreaming = function () {
	clearInterval(this.videoInterval);
}

// draws frame onto visible canvas
camgaze.Camera.prototype.drawFrame = function (imgData) {
	//console.log(imgData);
	this.context.putImageData(
		imgData,
		0, 0
   );
}

camgaze.Camera.prototype.copyFrame = function (srcImage) {
    var dst = this.invisibleContext.createImageData(
    	srcImage.width, 
    	srcImage.height
    );
    dst.data.set(srcImage.data);
    return dst;
}

camgaze.Camera.prototype.convertToCanvas = function (imageData, jsFeatData) {
	var image_data = this.copyFrame(imageData);
    var data_u32 = new Uint32Array(image_data.data.buffer);
    var alpha = (0xff << 24);
    var i = jsFeatData.cols*jsFeatData.rows, pix = 0;
    while(--i >= 0) {
        pix = jsFeatData.data[i];
        data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
    }
    return image_data;
}

camgaze.Camera.prototype.getFrame = function () {
	return this.invisibleContext.getImageData(
		0, 
		0, 
		this.invisibleCanvas.width, 
		this.invisibleCanvas.height
	);
}


















