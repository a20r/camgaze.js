

//////////////////////////////////////////////////////////////
//
// Code to test if the API is working. Not unit tests but
// interval tests to see if new components work as expected
//
//////////////////////////////////////////////////////////////

var trackingData;
window.onload = function () {
	
	var cGaze = new camgaze.Camgaze("mainCanvas", "invisibleCanvas", 640, 480);
	var eyeTracker = new camgaze.EyeTracker(640, 480);
	var frameOp = function (image_data, video) {
		trackingData = eyeTracker.track(image_data, video);
		if (trackingData.eyeList.length > 0) {
			console.log(trackingData);
		}
		return image_data;
	};
	cGaze.setFrameOperator(frameOp);
} 