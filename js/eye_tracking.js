

//////////////////////////////////////////////////////////////
//
// Code to test if the API is working. Not unit tests but
// interval tests to see if new components work as expected
//
// This is where the app will go when the eye tracking 
// is finished.
//
//////////////////////////////////////////////////////////////

window.onload = function () {
	
	var cGaze = new camgaze.Camgaze(640, 480, "mainCanvas", true);
	var eyeTracker = new camgaze.EyeTracker(640, 480);
	var eyeFilter = new camgaze.EyeFilter();
	//var drawer = new camgaze.drawing.ImageDrawer();
	
	var frameOp = function (image_data, video, drawer) {
		var trackingData = eyeTracker.track(image_data, video);
		var gazeList = eyeFilter.getFilteredGaze(trackingData);
		if (trackingData.eyeList.length > 0) {
			gazeList.forEach(
				function (eye) {

					drawer.drawCircle(
						//image_data,
						eye.centroid.unfiltered,
						4,  // radius
						-1, // line width (filled)
						"red"
					);
					// image_data = drawer.drawRectangle(
					// 	image_data,
					// 	eye.eyeData.getHaarRectangle(),
					// 	eye.eyeData.getHaarRectangle().width,
					// 	eye.eyeData.getHaarRectangle().height,
					// 	2,
					// 	"green"
					// );
					// image_data = drawer.drawLine(
					// 	image_data,
					// 	eye.centroid.unfiltered,
					// 	eye.centroid.unfiltered.add(
					// 		eye.gazeVector
					// 	),
					// 	2, // line width
					// 	"lightblue"
					// );
				}
			);
		}
		//return image_data
	};
	cGaze.setFrameOperator(frameOp);
} 