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
