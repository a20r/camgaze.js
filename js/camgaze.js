

//////////////////////////////////////////////////////////////
//
// This is the camgaze API. Enjoy!
// 
// This code is held under a Creative Commons 
// Attribution-ShareAlike 3.0 Unported License
//
// name : Alex Wallar
// email : aw204@st-andrews.ac.uk
// github : http://github.com/wallarelvo
//
//////////////////////////////////////////////////////////////     

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * /

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
// Global API for camgaze
//
//////////////////////////////////////////////////////////////

camgaze.Camgaze = function (mCanvasId, iCanvasId, xSize, ySize) {
	this.canvas = document.getElementById(mCanvasId);
	this.invisibleCanvas = document.getElementById(iCanvasId);
	this.xSize = xSize;
	this.ySize = ySize;
	this.cam = new camgaze.Camera (
		mCanvasId, 
		iCanvasId,
		xSize, ySize
	);
	this.video = document.querySelector("video");
}

/*
	Constructs the main loop of the program. The user
	sets the callback function where all of the processing
	happens. The structure of the callback function
	needs to be as follows. 

	function callback (
		image_data : ImageData {
			width,
			height,
			data ==> [r, g, b, a, ....]
		}, 
		video : video {
			src,
			videoHeight,
			videoWidth
		}
	) --> returns : ImageData ==> image to be displayed

	The return value of the callback function should be the 
	ImageData that the user wants to be displayed on the canvas
*/
camgaze.Camgaze.prototype.setFrameOperator = function (callback) {
	var self = this;
	var frameOp = function () {
		compatibility.requestAnimationFrame(frameOp);
		if (self.cam.videoReady()) {
			var frame = self.cam.getFrame();
			var img = callback(frame, self.video);
			var canvasImg = self.cam.convertToCanvas(frame, img);
			self.cam.drawFrame(canvasImg);
		}
	};

	compatibility.requestAnimationFrame(frameOp);
}

//////////////////////////////////////////////////////////////
//
// UnionFind
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
				var groupa = this.group[this.leader[leadera]];
				var groupb = this.group[this.leader[leaderb]];
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
				if (this.group[leadera] == undefined) {
					this.group[this.leader[leadera]].push(b);
				} else {
					this.group[leadera].push(b);
				}
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
				this.group[a] = [b];	
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
// Point
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
// Blob
//
// Object used to represent a blob. Holds information 
// relative to a binary blob such as the contour and the
// centroid
//
//////////////////////////////////////////////////////////////

camgaze.structures.Blob = function (centroid, contour, contourArea) {
	this.centroid = centroid
	this.contour = contour
	this.contourArea = contourArea
}

camgaze.structures.Blob.prototype = {
	getCentroid : function () {
		return this.centroid;
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
// Set
//
// A simple set structure that only has unique objects. This
// means that the structure does not contain duplicates. 
// Duplicates are weeded out by passing a function into the 
// constructor that returns the unique hash of the object.
//
// hashFunc structuring:
// function hashFunc(obj : Object) --> String
//
//////////////////////////////////////////////////////////////

camgaze.structures.Set = function (hashFunc, arrayToConvert) {
	if (arrayToConvert != undefined) {
		var set = new Object();
		arrayToConvert.forEach(
			function (val) {
				if (!(hashFunc(val) in set)) {
					set[hashFunc(val)] = val;
				}
			}
		);
		this.set = set;
		this.hashFunc = hashFunc;
	} else {
		this.set = new Object();
		this.hashFunc = hashFunc;
	}
}

camgaze.structures.Set.prototype = {

	// puts a value into the set, if
	// the value is already there, it 
	// does not update the value.
	put : function (val) {
		if (!(this.hashFunc(val) in this.set)) {
			this.set[this.hashFunc(val)] = val;
		}
		return this;
	},

	// updates the value inside the set. 
	// If the value is not in the set,
	// it puts it into the set.
	update : function (val) {
		this.set[this.hashFunc(val)] = val;
	},

	// gets a value from the set
	get : function (hashVal) {
		return this.set[hashVal];
	},

	// gets the set difference. For the 
	// return set, the hash function used
	// is the the one from the set you are
	// calling difference from
	difference : function (otherSet) {
		var retSet = new camgaze.structures.Set(this.hashFunc);
		for (var key in this.set) {
			if (!(key in otherSet.set)) {
				retSet.update(this.set[key]);
			}
		}
		return retSet;
	}
}

//////////////////////////////////////////////////////////////
//
// Rectangle
//
// Simple implementation of a rectangle structure which has 
// data about top left x and y value as well as the width and
// height.
//
//////////////////////////////////////////////////////////////

camgaze.structures.Rectangle = function (x, y, w, h) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
}

//////////////////////////////////////////////////////////////
//
// HaarDetector
//
// This is a class for detecting Haar like objects using
// a trained Haar classifier written in Javascript.
//
//////////////////////////////////////////////////////////////

camgaze.CVUtil.HaarDetector = function (classifier, imageWidth, imageHeight) {
	
	this.classifier = classifier;

	var max_work_size = 160;
	var scale = Math.min(
		max_work_size / imageWidth, 
		max_work_size / imageHeight
	);

	this.imageWidth = imageWidth;
	this.imageHeight = imageHeight;

	w = (imageWidth * scale) | 0;
	h = (imageHeight * scale) | 0;

	// this canvas is needed for the resizing of the image
	// i.e. the HTML5 developers got lazy
	var work_canvas = document.createElement("canvas");
	work_canvas.width = w;
	work_canvas.height = h;
	this.ctx = work_canvas.getContext("2d");


	this.img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
	this.ii_sum = new Int32Array((w + 1) * (h + 1));
	this.ii_sqsum = new Int32Array((w + 1) * (h + 1));
	this.ii_tilted = new Int32Array((w + 1) * (h + 1));
	this.w = w;
	this.h = h;
}

// detects objects based on the classifier
camgaze.CVUtil.HaarDetector.prototype = {
	detectObjects : function (video, scaleFactor, minScale) {
		"use strict";
		this.ctx.drawImage(video, 0, 0, this.w, this.h);
		var imageData = this.ctx.getImageData(0, 0, this.w, this.h);

		jsfeat.imgproc.grayscale(imageData.data, this.img_u8.data);
		jsfeat.imgproc.equalize_histogram(this.img_u8, this.img_u8);
		//jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3);

		// gets the integral image
		jsfeat.imgproc.compute_integral_image(
			this.img_u8, 
			this.ii_sum, 
			this.ii_sqsum, 
			this.classifier.tilted ? ii_tilted : null
		);

		jsfeat.haar.edges_density = 0.13;

		// finally detects the objects
		rects = jsfeat.haar.detect_multi_scale(
			this.ii_sum, 
			this.ii_sqsum, 
			this.ii_tilted, 
			null, 
			this.img_u8.cols, 
			this.img_u8.rows, 
			this.classifier, 
			scaleFactor, 
			minScale
		);
		rects = jsfeat.haar.group_rectangles(rects, 1);
		return this.scaleRectangles(
			rects, 
			this.imageWidth / this.img_u8.cols
		);
	},

	// scales the rectangles back up 
	scaleRectangles : function (rects, sc) {
		var rectArray = new Array(rects.length);
		for (var i = 0; i < rects.length; i++) {
			rectArray[i] = {
				x: sc * rects[i].x,
				y: sc * rects[i].y,
				width: sc * rects[i].width,
				height: sc * rects[i].height,
				confidence : rects[i].confidence
			};
		}
		return rectArray;
	}
}

//////////////////////////////////////////////////////////////
//
// CVUtil
//
// This namespace is reserved for image processing functions
// that I could not find implemented elsewhere
//
//////////////////////////////////////////////////////////////

// aquires the image moments
camgaze.CVUtil.getMoments = function (contourArray, sizeX, sizeThresh) {
	var blobArray = new Array();
	for (var i = 0; i < contourArray.length; i++) {
		var m00 = contourArray[i].length; // area
		if (m00 > sizeThresh) {
			var m10 = 0;
			var m01 = 0;
			for (var j = 0; j < m00; j++) {
				m10 += (contourArray[i][j] % sizeX);
				m01 += Math.floor(contourArray[i][j] / sizeX);
			}
			blobArray.push(
				new camgaze.structures.Blob(
					new camgaze.structures.Point(
						(m10 / m00).toFixed(0),
						(m01 / m00).toFixed(0)
					),
					contourArray[i],
					m00
				)
			);
		}
	}
	return blobArray;
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
camgaze.CVUtil.getConnectedComponents = function (BW, sizeThreshold) {
	var uf = new camgaze.structures.UnionFind();
	var labelImg = jsfeat.cache.get_buffer(BW.cols * BW.rows);
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
					return labelImg.data[element] != undefined;
				}
			).map(
				function (element) {
					return labelImg.data[element];
				}
			);

			// if none of the neighbours are labeled
			// label the current index uniquely
			if (neighbors.length == 0) {
				labelImg.data[currentIndex] = maxLabel;
				uf.add(
					maxLabel, 
					currentIndex
				);
				maxLabel--;
			} else {
				var minLabel = Math.max.apply(null, neighbors);
				labelImg.data[currentIndex] = minLabel;
				uf.add(
					uf.getLeader(minLabel), 
					currentIndex
				);
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
	jsfeat.cache.put_buffer(labelImg);
	return camgaze.CVUtil.getMoments(
		uf.getGroupList(),
		BW.cols,
		sizeThreshold
	);
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
// MovingAveragePoints
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

	assignIds : function (prevEyes) {
		// implement this shit bro
	}

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
	}
}

//////////////////////////////////////////////////////////////
// 
// EyeData
//
// Class used to hold data about the eye such as the pupil, 
// the bounding Haar rectangle, the unique id, and the max
// and minimum thresholding colors
//
//////////////////////////////////////////////////////////////

camgaze.EyeData = function (xScaledSize, yScaledSize) {
	this.xScaledSize = xScaledSize;
	this.yScaledSize = yScaledSize;
	this.haarRectangle = undefined;
	this.pupil = undefined;
	this.image = undefined;
	this.uId = undefined;
	this.maxColor = undefined;
	this.minColor = undefined;
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

	// image is an ImageData
	setImage : function (image) {
		this.image = image;
		return this;
	},

	// rect is a Rectangle object
	setHaarRectangle : function (rect) {
		this.rect = rect
		return this;
	},

	setMaxMinColor : function (maxColor, minColor) {
		this.maxColor = maxColor;
		this.minColor = minColor;
		return this;
	},

	getCornerDistances : function () {
		var pb = this.pupil;
		return {
			topLeft : pb.getCentroid().distTo(
				{
					x : this.haarRectangle.x,
					y : this.haarRectangle.y
				}
			),
			topRight : pb.getCentroid().distTo(
				{
					x : this.haarRectangle.x + this.haarRectangle.w,
					y : this.haarRectangle.y
				}
			),
			bottomLeft : pb.getCentroid().distTo(
				{
					x : this.haarRectangle.x,
					y : this.haarRectangle.y + this.haarRectangle.h
				}
			),
			bottomRight : pb.getCentroid().distTo(
				{
					x : this.haarRectangle.x + this.haarRectangle.w,
					y : this.haarRectangle.y + this.haarRectangle.h
				}
			)
		}
	},

	getCornerVectors : function () {
		var pb = this.pupil;
		var centroid = pb.getCentroid();
		return {
			topLeft : new camgaze.structures.Point(
				centroid.x,
				centroid.y
			),
			topRight : new camgaze.structures.Point(
				centroid.x - this.xScaledSize,
				centroid.y
			),
			bottomLeft : new camgaze.structures.Point(
				centroid.x,
				centroid.y - this.yScaledSize
			),
			bottomRight : new camgaze.structures.Point(
				centroid.x - this.xScaledSize,
				centroid.y - this.yScaledSize
			)
		}
	}, 

	getResultantVector : function () {
		var cVecs = this.getCornerVectors();
		var resVec = new camgaze.structures.Point(0, 0);
		for (var k in cVecs) {
			resVecs = resVecs.add(cVecs[k]);
		}
		return resVec;
	},

	getMaxMinColors : function () {
		return new camgaze.structures.Point(
			this.maxColor, 
			this.minColor
		);
	},

	getHaarCentroid : function () {
		return new camgaze.structures.Point(
			this.haarRectangle.x + this.haarRectangle.w / 2,
			this.haarRectangle.y + this.haarRectangle.h / 2
		);
	},

	getId : function () {
		return this.uId;
	},

	getHaarRectangle : function () {
		return this.haarRectangle;
	},

	getPupil : function () {
		return this.pupil;
	},

	getImage : function () {
		return this.image;
	}
}

//////////////////////////////////////////////////////////////
// 
// Camera
//
// Class used to get the raw image from the camera. It parses
// the camera stream into a canvas and returns the ImageData
// associated with it
//
//////////////////////////////////////////////////////////////

camgaze.Camera = function (canvasId, invisibleCanvasId, dimX, dimY) {
	this.canvas = document.getElementById(canvasId);
	this.canvas.width = dimX;
	this.canvas.height = dimY;

	this.invisibleCanvas = document.getElementById(
		invisibleCanvasId
	);
	this.invisibleCanvas.width = dimX;
	this.invisibleCanvas.height = dimY;

	this.context = this.canvas.getContext('2d');
	this.invisibleContext = this.invisibleCanvas.getContext('2d');

	this.video = document.querySelector(
	  'video'
	);

	var self = this;
	if (compatibility.getUserMedia) {
		compatibility.getUserMedia(
			{
	    		video : true
	    	},
	    	this.showFrame(self),
	    	this.videoFail
	  	)
	}
}

camgaze.Camera.prototype.videoReady = function () {
	return this.video.readyState == this.video.HAVE_ENOUGH_DATA;
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
		self.video.src = window.URL.createObjectURL(
			localMediaStream
		);
	}
}

camgaze.Camera.prototype.videoFail = function (e) {
	console.log("VIDEO ERROR:\t", e);
}

camgaze.Camera.prototype.pauseStreaming = function () {
	this.video.pause();
}

camgaze.Camera.prototype.playStreaming = function () {
	this.video.play();
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
	this.invisibleContext.drawImage(
		this.video,
		0,
		0,
		this.invisibleCanvas.width,
		this.invisibleCanvas.height
	);
	return this.invisibleContext.getImageData(
		0, 
		0, 
		this.invisibleCanvas.width, 
		this.invisibleCanvas.height
	);
}

