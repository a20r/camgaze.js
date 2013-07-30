

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
		//console.log(trackingData);
		var gazeList = eyeFilter.getFilteredGaze(trackingData);
		if (trackingData.eyeList.length > 0) {
			drawer.clearAll();
			gazeList.forEach(
				function (eye) {
					// draws the face circle
					drawer.drawCircle(
						{
							x : (
								eye.eyeData.getFace().x + 
								eye.eyeData.getFace().width / 2
							),
							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height / 2
							)
						},
						eye.eyeData.getFace().width / 2,
						2,
						"red"
					);

					// draws the first eye circle
					drawer.drawCircle(
						{
							x : (
								eye.eyeData.getFace().x + 
								eye.eyeData.getFace().width * 0.21 + 
								eye.eyeData.getHaarRectangle().width / 2
							),
							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height * 0.37
							)
						},
						eye.eyeData.getHaarRectangle().width / 2.2,  // radius
						2, // line width (filled)
						"red"
					);

					// draws the second eye circle
					drawer.drawCircle(
						{
							x : (
								eye.eyeData.getFace().x + 
								eye.eyeData.getFace().width * 0.54 + 
								eye.eyeData.getHaarRectangle().width / 2
							),
							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height * 0.37
							)
						},
						eye.eyeData.getHaarRectangle().width / 2.2,  // radius
						2, // line width (filled)
						"red"
					);

					// draws the first nose line
					drawer.drawLine(
						{
							x : (
								eye.eyeData.getFace().x + 
								eye.eyeData.getFace().width / 2 
							),

							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height / 2 
							)
						},

						{
							x : (
								eye.eyeData.getFace().x + 20 +
								eye.eyeData.getFace().width / 2 
							),

							y : (
								eye.eyeData.getFace().y + 20 +
								eye.eyeData.getFace().height / 2 
							)
						},

						2,
						"red"
					);

					// draws horizontal nose line
					drawer.drawLine(
						{
							x : (
								eye.eyeData.getFace().x + 20 +
								eye.eyeData.getFace().width / 2 
							),

							y : (
								eye.eyeData.getFace().y + 20 +
								eye.eyeData.getFace().height / 2 
							)
						},

						{
							x : (
								eye.eyeData.getFace().x +
								eye.eyeData.getFace().width / 2 
							),

							y : (
								eye.eyeData.getFace().y + 20 +
								eye.eyeData.getFace().height / 2 
							)
						},

						2,
						"red"
					);

					// draws smile
					drawer.drawLine(
						{
							x : (
								eye.eyeData.getFace().x +
								eye.eyeData.getFace().width * 0.5
							),

							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height * 0.7
							)
						},

						{
							x : (
								eye.eyeData.getFace().x +
								eye.eyeData.getFace().width * 0.4
							),

							y : (
								eye.eyeData.getFace().y +
								eye.eyeData.getFace().height * 0.6
							)
						},

						2,
						"red"
					);

					// draws smile
					drawer.drawLine(
						{
							x : (
								eye.eyeData.getFace().x +
								eye.eyeData.getFace().width * 0.5
							),

							y : (
								eye.eyeData.getFace().y + 
								eye.eyeData.getFace().height * 0.7
							)
						},

						{
							x : (
								eye.eyeData.getFace().x +
								eye.eyeData.getFace().width * 0.6
							),

							y : (
								eye.eyeData.getFace().y +
								eye.eyeData.getFace().height * 0.6
							)
						},

						2,
						"red"
					);

					drawer.drawLine(
						eye.centroid.filtered,
						eye.centroid.filtered.add(eye.gazeVector),
						2,
						"green"
					);

					// draws the pupil
					drawer.drawCircle(
						eye.centroid.filtered,
						4,  // radius
						-1, // line width (filled)
						"red"
					);
				}
			);
		}
	};
	cGaze.setFrameOperator(frameOp);
} 