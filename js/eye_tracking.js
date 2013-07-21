

//////////////////////////////////////////////////////////////
//
// Code to test if the API is working. Not unit tests but
// interval tests to see if new components work as expected
//
// This is where the app will go when the eye tracking 
// is finished.
//
//////////////////////////////////////////////////////////////

var trackingData;
window.onload = function () {
	
	var cGaze = new camgaze.Camgaze("mainCanvas", 640, 480);
	var eyeTracker = new camgaze.EyeTracker(640, 480);
	var drawer = new camgaze.Drawer();
	var frameOp = function (image_data, video) {
		trackingData = eyeTracker.track(image_data, video);
		if (trackingData.eyeList.length > 0) {
			trackingData.getEyeList().forEach(
				function (eye) {
					//console.log(eye.getScaledCentroid());

					image_data = drawer.drawCircle(
						image_data,
						eye.getScaledCentroid(),
						2, // radius
						-1, // line width (filled)
						"red"
					);

					/*
					image_data = drawer.drawRectangle(
						image_data,
						eye.getHaarRectangle(),
						eye.getHaarRectangle().width,
						eye.getHaarRectangle().height,
						3,
						"lightgreen"
					);
					*/
					///*
					image_data = drawer.drawLine(
						image_data,
						eye.getScaledCentroid(),
						eye.getScaledCentroid().add(
							eye.getResultantVector()
						),
						2, // line width
						"lightblue"
					);
					//*/
				}
			);
		}
		return image_data
	};
	cGaze.setFrameOperator(frameOp);
} 