<html lang="en">
    <head>
    	<meta charset="utf-8">
    	<title>Camgaze.js</title>
    	<meta name="viewport" content="width=device-width, initial-scale=1.0">
    	<meta name="description" content="">
    	<meta name="author" content="">
    	<style type="text/css">
        	body {
        		padding-top: 60px;
        		padding-bottom: 40px;
        	}
            
            .container-narrow {
                margin: 0 auto;
                max-width: 600px;
            }

            iframe {
                padding-bottom: 40px;
            }
    	</style>
    	<!-- Le Bootstrap styles -->
        <link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.min.css" rel="stylesheet">
    	<!-- HTML5 shim, for IE6-8 support of HTML5 elements -->
        <!--[if lt IE 9]>
          <script src="js/html5shiv.js"></script>
          <![endif]-->

        <link type="text/css" rel="stylesheet" href="chrome-extension://cpngackimfmofbokmjmljamhdncknpmg/style.css">
        <script type="text/javascript" charset="utf-8" src="chrome-extension://cpngackimfmofbokmjmljamhdncknpmg/page_context.js"></script>
    </head>
    <body screen_capture_injected="true">
        <div class="container-narrow">
            <div class="masthead">
                <ul class="nav nav-pills pull-right">
                    <li class="active"><a href="/camgaze.js">Home</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#demos">Demos</a></li>
                    <li><a href="#videos">Videos</a></li>
                    <li><a href="http://github.com/wallarelvo/camgaze.js">Source</a></li>
                </ul>
                <h3 class="muted">Camgaze.js</h3>
            </div>
            <div class="hero-unit">
                <img src="http://aw204.host.cs.st-andrews.ac.uk/camgaze.js/imgs/eye_tracking.jpg">
                <h1 style="padding-bottom:10;">Camgaze.js</h1>
                <p>Eye Tracking and Gaze Prediction in JavaScript</p>
                <p>
                    <a href="https://github.com/wallarelvo/camgaze.js/archive/master.zip" class="btn btn-primary btn-large">
                        Download source »
                    </a>
                </p>
            </div>
            <div class="hero-unit">
                <h1 style="padding-bottom:10;">About</h1>
                <p>
                    <b>Camgaze.js</b> is a JavaScript computer vision library
                    which primary focus is eye tracking and gaze detection.
                    <b>Camgaze.js</b> uses the 
                    <a href="http://inspirit.github.io/jsfeat/">jsfeat</a> 
                    computer vision library as a backbone and builds upon
                    its foundation. <b>Camgaze.js</b> enables easier detection
                    of objects using the
                    <a href="http://en.wikipedia.org/wiki/Viola%E2%80%93Jones_object_detection_framework">Viola-Jones
                    Object Detection Framework</a>. It also provides algorithms
                    for binary image operations such as blob detection 
                    and image moment calculations. 
                </p>
            </div>
            <div class="hero-unit" id="demos">
                <h1 style="padding-bottom:10;">Demos</h1>
                <ul class="nav nav-pills nav-stacked">
                    <li>
                        <a href="examples/blob_detection.html">
                            <h4>Blob Detection</h4>
                        </a>
                    </li>
                    <li>
                        <a href="examples/face_detection.html">
                            <h4>Face Detection</h4>
                        </a>
                    </li>
                    <li>
                        <a href="examples/smiley_face.html">
                            <h4>Gaze Prediction</h4>
                        </a>
                    </li>
                </ul>
            </div>

            <div class="hero-unit" id="videos">
                <h1 style="padding-bottom:10;">Videos</h1>
                <iframe width="480" height="340" src="//www.youtube.com/embed/w1vurmCOI_I" frameborder="0" allowfullscreen></iframe>
                <iframe width="480" height="340" src="//www.youtube.com/embed/0GDYRIPZKWM" frameborder="0" allowfullscreen></iframe>
                <iframe style="padding-bottom: 20px;" width="480" height="340" src="//www.youtube.com/embed/tLh4r4J5zjY" frameborder="0" allowfullscreen></iframe>
            </div>

            <div class="footer">
                <p>
                    Creator: 
                    <a href="http://www.linkedin.com/pub/alexander-wallar/68/985/b87">
                        Alex Wallar
                    </a>| <a href="mailto:aw204@st-andrews.ac.uk">aw204@st-andrews.ac.uk</a>
                </p>
                <p>
                    Website by: 
                    <a href="http://www.thundersun.net">
                        Valentin Tunev
                    </a>
                </p>
            </div>
        </div>
    </body>
</html>