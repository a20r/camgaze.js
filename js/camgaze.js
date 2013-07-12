
// namespace
camgaze = {}

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

camgaze.Blob = function (centroid, convexHull, convexHullArea, contour, contourArea) {
	this.centroid = centroid
	this.convexHull = convexHull
	this.contour = contour
	this.convexHullArea = convexHullArea
	this.contourArea = contourArea
}
