

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

/*
var cam = undefined;
var contourArray;
window.onload = function () {
	
	var cGaze = new camgaze.Camgaze("mainCanvas", "invisibleCanvas", 640, 480, 1);
	var frameOp = function (image_data) {
		var gray_img = camgaze.CVUtil.toGrayscale(image_data);
		var binary_img = camgaze.CVUtil.grayScaleInRange(gray_img, 12, 26);
		contourArray = camgaze.CVUtil.getConnectedComponents(binary_img);
		var rects = camgaze.CVUtil.detectObjects(image_data, jsfeat.haar.frontalface, 1.2, 2);
		return binary_img;
	};
	cGaze.setFrameOperator(frameOp);
}
*/

$(window).load(function() {

    // lets do some fun
    var video = document.querySelector("video");
    var canvas = document.getElementById('mainCanvas');
    canvas.width = 640;
    canvas.height = 480;
    compatibility.getUserMedia({video: true}, function(stream) {
        try {
            video.src = compatibility.URL.createObjectURL(stream);
        } catch (error) {
            video.src = stream;
        }
        setTimeout(function() {
                video.play();
                demo_app();
            
                compatibility.requestAnimationFrame(tick);
            }, 500);
    }, function (error) {
    });

    var ctx,canvasWidth,canvasHeight;
    var img_u8,work_canvas,work_ctx,ii_sum,ii_sqsum,ii_tilted,edg,ii_canny;
    var classifier = jsfeat.haar.frontalface;

    var max_work_size = 160;

    function demo_app() {
        canvasWidth  = canvas.width;
        canvasHeight = canvas.height;
        ctx = canvas.getContext('2d');

        ctx.fillStyle = "rgb(0,255,0)";
        ctx.strokeStyle = "rgb(0,255,0)";

        var scale = Math.min(max_work_size/video.videoWidth, max_work_size/video.videoHeight);
        var w = (video.videoWidth*scale)|0;
        var h = (video.videoHeight*scale)|0;

        img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
        edg = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
        work_canvas = document.getElementById("invisibleCanvas");
        work_canvas.width = w;
        work_canvas.height = h;
        work_ctx = work_canvas.getContext('2d');
        ii_sum = new Int32Array((w+1)*(h+1));
        ii_sqsum = new Int32Array((w+1)*(h+1));
        ii_tilted = new Int32Array((w+1)*(h+1));
    }

    function tick() {
        compatibility.requestAnimationFrame(tick);
        if (video.readyState === video.HAVE_ENOUGH_DATA) {

            ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

            work_ctx.drawImage(video, 0, 0, work_canvas.width, work_canvas.height);
            var imageData = work_ctx.getImageData(0, 0, work_canvas.width, work_canvas.height);
            
            jsfeat.imgproc.grayscale(imageData.data, img_u8.data);

            jsfeat.imgproc.equalize_histogram(img_u8, img_u8);
            //jsfeat.imgproc.gaussian_blur(img_u8, img_u8, 3);

            jsfeat.imgproc.compute_integral_image(img_u8, ii_sum, ii_sqsum, classifier.tilted ? ii_tilted : null);

            jsfeat.haar.edges_density = 0.13;
            var rects = jsfeat.haar.detect_multi_scale(ii_sum, ii_sqsum, ii_tilted, null, img_u8.cols, img_u8.rows, classifier, 1.2, 2);
            rects = jsfeat.haar.group_rectangles(rects, 1);


            // draw only most confident one
            draw_faces(ctx, rects, canvasWidth/img_u8.cols, 1);
        }
    }

    function draw_faces(ctx, rects, sc, max) {
        var on = rects.length;
        if(on && max) {
            jsfeat.math.qsort(rects, 0, on-1, function(a,b){return (b.confidence<a.confidence);})
        }
        var n = max || on;
        n = Math.min(n, on);
        var r;
        for(var i = 0; i < n; ++i) {
            r = rects[i];
            ctx.strokeRect((r.x*sc)|0,(r.y*sc)|0,(r.width*sc)|0,(r.height*sc)|0);
        }
    }

    $(window).unload(function() {
        video.pause();
        video.src=null;
    });
});
        

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
}

// this is a very important function. 
camgaze.Camgaze.prototype.setFrameOperator = function (callback) {
	var self = this;
	var frameOp = function () {
		compatibility.requestAnimationFrame(frameOp);
		if (self.cam.videoReady()) {
			var frame = self.cam.getFrame();
			var img = callback(frame);
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
// CVUtil
//
// This namespace is reserved for image processing functions
// that I could not find implemented elsewhere
//
//////////////////////////////////////////////////////////////

camgaze.CVUtil.detectObjects = function (img, classifier, scaleFactor, minScale) {

	jsfeat.haar.edges_density = 0.13;
	var grayImage = camgaze.CVUtil.toGrayscale(img);

	var w = img.cols + 1;
	var h = img.rows + 1;
	var iiSum = new Int32Array(w * h);
	var iiSqsum = new Int32Array(w * h);
	var iiTilted = new Int32Array(w * h);

	jsfeat.imgproc.equalize_histogram(grayImage, grayImage);
	jsfeat.imgproc.compute_integral_image(
		grayImage,
		iiSum,
		iiSqsum,
		classifier.tilted ? iiTitled : null
	);
	
	var rects = jsfeat.haar.detect_multi_scale(
		iiSum, 
		iiSqsum, 
		iiTilted, 
		null, // for useCanny
		grayImage.cols,
		grayImage.rows,
		classifier,
		scaleFactor,
		minScale
	);
	return jsfeat.haar.group_rectangles(rects, 1);
	
}

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
camgaze.CVUtil.getConnectedComponents = function (BW) {
	var uf = new camgaze.structures.UnionFind();
	var labelImg = jsfeat.cache.get_buffer(BW.cols * BW.rows); //new Array(BW.cols * BW.rows);
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
		30
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

