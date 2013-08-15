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

            div#badge {
                width: 141px;
                height: 141px;
                position: fixed;
                top: 0;
                right: 0;
            }
    	</style>
    	<!-- Le Bootstrap styles -->
        <link href="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.2/css/bootstrap-combined.min.css" rel="stylesheet">

        <link type="text/css" rel="stylesheet" href="chrome-extension://cpngackimfmofbokmjmljamhdncknpmg/style.css">
        <script type="text/javascript" charset="utf-8" src="chrome-extension://cpngackimfmofbokmjmljamhdncknpmg/page_context.js"></script>
    </head>
    <body screen_capture_injected="true">
    <div id="badge">
        <a href="https://github.com/wallarelvo/camgaze.js/fork" style="position: absolute; z-index:2; top: 0; right: 0; border: 0;">
            <img src="http://webaudiodemos.appspot.com/input/img/forkme.png" alt="Fork me on GitHub">
        </a>
    </div>
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
            <div class="hero-unit" id="about">
                <h1 style="padding-bottom:10;">About</h1>
                <p>
                    <b>Camgaze.js</b> is a JavaScript computer vision library
                    which primary focus is eye tracking and gaze detection.
                    Camgaze.js uses the 
                    <a href="http://inspirit.github.io/jsfeat/">jsfeat</a> 
                    computer vision library as a backbone and builds upon
                    its foundation. Camgaze.js enables easier detection
                    of objects using the
                    <a href="http://en.wikipedia.org/wiki/Viola%E2%80%93Jones_object_detection_framework">Viola-Jones
                    Object Detection Framework</a>. It also provides algorithms
                    for binary image operations such as blob detection 
                    and image moment calculations. However Camgaze.js' biggest
                    contribution to the online community is that it provides
                    a suite of classes and functions to detect pupils and
                    predict gaze direction.
                </p>
                <p>
                    <b>Camgaze.js</b> is being developed by
                    <a href="http://www.linkedin.com/pub/alexander-wallar/68/985/b87">
                        Alex Wallar
                    </a> as part of a National Science Foundation funded 
                    internship at the University of Notre Dame's 
                    <a href="http://www3.nd.edu/~darts/reu.html">
                        Experimental Research in Wireless Networking
                    </a> group.
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
                <iframe style="padding-bottom: 20px;" width="480" height="340" src="//www.youtube.com/embed/Ns7wtTUui28" frameborder="0" allowfullscreen></iframe>
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
                <a rel="license" href="http://creativecommons.org/licenses/by-sa/3.0/deed.en_US"><img alt="Creative Commons License" style="border-width:0" src="http://i.creativecommons.org/l/by-sa/3.0/88x31.png" /></a><br /><span xmlns:dct="http://purl.org/dc/terms/" property="dct:title">Camgaze.js</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="http://github.com/wallarelvo/camgaze.js" property="cc:attributionName" rel="cc:attributionURL">Alexander Wallar</a> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/3.0/deed.en_US">Creative Commons Attribution-ShareAlike 3.0 Unported License</a>.
            </div>
        </div>
        <script>
          (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
          (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
          })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

          ga('create', 'UA-42869545-1', 'st-andrews.ac.uk');
          ga('send', 'pageview');

        </script>
    </body>
</html>