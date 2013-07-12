
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
	// finishing up for today I think.
}

camgaze.MovingAveragePoints.prototype.compound = function (value, refPoint) {
	this.put(value);
	maListCopy = this.movAvgList.slice(0);
	this.lastMean = this.getMean(
		this.removeOutliers(maListCopy, refPoint);
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
		lPoint = this.movAvgList[this.movAvgList.length];
		for (var i = 0; i < length - this.movAvgList.length; i++) {
			this.movAvgList.push(lPoint);
		}
	}
	return this;
}

camgaze.MovingAveragePoints.prototype.getLastCompoundedResult = function () {
	return this.lastMean;
}
