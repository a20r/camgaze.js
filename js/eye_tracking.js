

//////////////////////////////////////////////////////////////
//
// Code to test if the API is working. Not unit tests but
// interval tests to see if new components work as expected
//
//////////////////////////////////////////////////////////////

var cam = undefined;
var contourArray;
var rects;
window.onload = function () {
	
	var cGaze = new camgaze.Camgaze("mainCanvas", "invisibleCanvas", 640, 480);
	var haar = new camgaze.CVUtil.HaarDetector(jsfeat.haar.frontalface, 640, 480);
	var frameOp = function (image_data, video) {
		//var gray_img = camgaze.CVUtil.toGrayscale(image_data);
		//var binary_img = camgaze.CVUtil.grayScaleInRange(gray_img, 12, 26);
		//contourArray = camgaze.CVUtil.getConnectedComponents(binary_img);
		rects = haar.detectObjects(video, 1.8, 2);
		return image_data;
	};
	cGaze.setFrameOperator(frameOp);
} 