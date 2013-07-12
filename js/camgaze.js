

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
window.onload = function () {
	cam = new camgaze.Camera(
		"mainCanvas", 
		"invisibleCanvas",
		640, 480, 
		10
	);
	setInterval(
		function () {
			cam.drawFrame(cam.getFrame());
		},
		cam.frameWaitTime
	);
}

// namespace
camgaze = {}

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

camgaze.Blob.getMoments = function (blob, i, j) {

}

camgaze.Blob.getBlobs = function (BW, minSize) {

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

camgaze.Camera.prototype.getFrame = function () {
	return this.invisibleContext.getImageData(
		0, 
		0, 
		this.invisibleCanvas.width, 
		this.invisibleCanvas.height
	);
}


















