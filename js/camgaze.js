

////////////////////////////////////////
//
// This is the camgaze API. Enjoy!
// 
// This code is held under a Creative
// Commons Attribution-ShareAlike 3.0 
// Unported License
//
// name : Alex Wallar
// email : aw204@st-andrews.ac.uk
//
////////////////////////////////////////

// namespace
camgaze = {}

///////////////////////////////////////
//
// Object used to represent a point.
// Used throughout the project. 
//
///////////////////////////////////////

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

///////////////////////////////////////
//
// Object used to represent a blob.
// Holds information relative to a binary
// blob such as the contour, the convex
// hull, and the centroid 
//
///////////////////////////////////////

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

camgaze.Blob.getBlobs = function (BW, minSize) {
	// Do this tomorrow!
}

///////////////////////////////////////
//
// Implementation of a dynamic, moving
// average list. Elements are pushed to
// the list, but the list remains the
// same size by removing one element.
// The compounded value is the mean of 
// the list. This is used to reduce
// jitter in data with a lot of noise
//
///////////////////////////////////////

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
