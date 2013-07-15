

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

//////////////////////////////////////////////////////////////
//
// Code to test if the API is working. Not unit tests but
// interval tests to see if new components work as expected
//
//////////////////////////////////////////////////////////////

var cam = undefined;
var contourArray;
var gray_img;
window.onload = function () {
	cam = new camgaze.Camera (
		"mainCanvas", 
		"invisibleCanvas",
		640, 480, 
		1
	);
	setInterval(
		function () {
			var image_data = cam.getFrame()
			gray_img = camgaze.CVUtil.toGrayscale(image_data);
			var binary_img = camgaze.CVUtil.grayScaleInRange(gray_img, 12, 26);
			contourArray = camgaze.CVUtil.getConnectedComponents(binary_img);
			var drawingImage = cam.convertToCanvas(image_data, binary_img);
			cam.drawFrame(drawingImage);
			//cam.drawFrame(image_data);
		},
		1
	);
}

//////////////////////////////////////////////////////////////
//
// All the namespaces used in the project
//
//////////////////////////////////////////////////////////////

camgaze = {};
camgaze.structures = {};
camgaze.CVUtil = {};

//////////////////////////////////////////////////////////////
//
// UnionFind data structure used to store neighbor 
// equivalence when dealing with connected components
//
//////////////////////////////////////////////////////////////

camgaze.structures.UnionFind = function () {
	this.leader = {};
	this.group = {};
}

camgaze.structures.UnionFind.prototype = {

	add : function (a, b) {
		//"use strict";
		if (b == undefined) {
			if (this.leader[a] == undefined) {
				this.leader[a] = a;
				this.group[a] = new Array();
				this.group[a].push(a)
			}
			return;
		}
		var leadera = this.leader[a];
		var leaderb = this.leader[b];
		if (leadera != undefined) {
			if (leaderb != undefined) {
				if (leadera == leaderb)  {
					return;
				}
				var groupa = this.group[leadera];
				var groupb = this.group[leaderb];
				this.leader[b] = leadera;

				$.merge(groupa, groupb);
				delete this.group[leaderb];
				for (var i = 0; i < groupb.length; i++) {
					this.leader[i] = leadera;
				}
			} else {
				//if (this.group[leadera] == undefined) {
					//this.group[leadera] = new Array();
				//}
				this.group[leadera].push(b);
				this.leader[b] = leadera;
			}
		} else {
			if (leaderb != undefined) {
				//if (this.group[leaderb] == undefined) {
					//this.group[leaderb] = new Array();
				//}
				this.group[leaderb].push(a);
				this.leader[a] = leaderb;
			} else {
				this.leader[a] = this.leader[b] = a;
				this.group[a] = [a, b];	
			}
		}
	},

	getLeaders : function () {
		return this.leader;
	},

	getLeader : function (i) {
		return this.leader[i];
	},

	getGroups : function () {
		return this.group;
	},

	getGroup : function (i) {
		return this.group[i];
	},

	getGroupList : function () {
		var retArray = new Array();
		for (var k in this.group) {
			retArray.push(this.group[k]);
		}
		return retArray;
	}
}

//////////////////////////////////////////////////////////////
//
// Object used to represent a point. Used throughout the 
// project. 
//
//////////////////////////////////////////////////////////////

camgaze.structures.Point = function (x, y) {
	this.x = x;
	this.y = y;
}

camgaze.structures.Point.prototype = {
	toList : function () {
		return [this.x, this.y];
	},

	add : function (otherPoint) {
		return new camgaze.structures.Point(
			this.x + otherPoint.x, 
			this.y + otherPoint.y
		);
	},

	sub : function (otherPoint) {
		return new camgaze.structures.Point(
			this.x - otherPoint.x, 
			this.y - otherPoint.y
		);
	},

	// returns the distance to another point
	distTo : function (otherPoint) {
		return Math.sqrt(
			Math.pow(this.x - otherPoint.x, 2) + 
			Math.pow(this.y - otherPoint.y, 2)
		)
	},

	getVal : function (ind) {
		if (ind == 0) {
			return x;
		} else if (ind == 1) {
			return y;
		} else {
			return undefined;
		}
	}
}

//////////////////////////////////////////////////////////////
//
// Object used to represent a blob. Holds information 
// relative to a binary blob such as the contour and the
// centroid
//
//////////////////////////////////////////////////////////////

camgaze.structures.Blob = function (centroid, contour, contourArea) {
	this.centroid = centroid
	this.convexHull = convexHull
	this.contour = contour
	this.convexHullArea = convexHullArea
	this.contourArea = contourArea
}

camgaze.structures.Blob.prototype = {
	getCentroid : function () {
		return new camgaze.structures.Point(
			this.centroid[0], 
			this.centroid[1]
		)
	},

	getContour : function () {
		return this.contour;
	},

	getContourArea : function () {
		return this.contourArea;
	}
}

//////////////////////////////////////////////////////////////
//
// This namespace is reserved for image processing functions
// that I could not find implemented elsewhere
//
//////////////////////////////////////////////////////////////

camgaze.CVUtil.getMoments = function (contour) {

}

camgaze.CVUtil.getPixelNeighborhood = function (img, i, j) {
	var retArray = new Array();
	var nps = [
		[-1, -1], [0, -1], [1, -1],
		[-1,  0]//, 		   [1,  0],
		//[-1,  1], [0,  1], [1,  1]
	];
	for (var k = 0; k < nps.length; k++) {
		pIndex = (j + nps[k][1]) * img.cols + i + nps[k][0];
		if ((i + nps[k][0] < img.cols && i + nps[k][0] >= 0) &&
			(j + nps[k][1] < img.rows && j + nps[k][1] >= 0)) {
			if (img.data[pIndex] > 0) {
				retArray.push(pIndex);
			}
		}
	}
	return retArray;
}

// Takes a one channel, binary image.
camgaze.CVUtil.getConnectedComponents = function (BW) {
	var uf = new camgaze.structures.UnionFind();
	var labelImg = new Array(BW.cols * BW.rows);
	var maxLabel = -1;
	for (var j = 0; j < BW.rows; j++) {
		for (var i = 0; i < BW.cols; i++) {
			var currentIndex = j * BW.cols + i;

			// discard pixels in the background
			if (BW.data[currentIndex] == 0) {
				continue;
			}

			// gets the neighbouring pixels
			var nps = camgaze.CVUtil.getPixelNeighborhood(
				BW, 
				i, j
			);

			// gets all of the already labeled
			// neighbours
			var neighbors = nps.filter(
				function (element, index, array) {
					return labelImg[element] != undefined;
				}
			).map(
				function (element) {
					return labelImg[element];
				}
			);

			// if none of the neighbours are labeled
			// label the current index uniquely
			if (neighbors.length == 0) {
				labelImg[currentIndex] = maxLabel;
				uf.add(maxLabel, currentIndex);
				maxLabel--;
			} else {
				var minLabel = Math.max.apply(null, neighbors);
				labelImg[currentIndex] = minLabel;
				uf.add(uf.getLeader(minLabel), currentIndex);
				for (var k = 0; k < neighbors.length; k++) {
					if (
						!(
							uf.getLeader(neighbors[k]) != undefined &&
							uf.getGroup(neighbors[k]) == undefined
						)
					) {
						uf.add(uf.getLeader(minLabel), uf.getLeader(neighbors[k]));
					}
				}
			}
		}
	}
	return uf.getGroupList();
}

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
			return new camgaze.structures.Point(
				point.x / maList.length,
				point.y / maList.length
			)
		}
	)

	var retVal = divList.reduce(
		function (prevPoint, curPoint) {
			return new camgaze.structures.Point(
				prevPoint.x + curPoint.x,
				prevPoint.y + curPoint.y
			)
		}
	)

	return new camgaze.structures.Point(
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
