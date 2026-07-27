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

  getX : function () {
    return parseInt(this.x);
  },

  getY : function () {
    return parseInt(this.y);
  },

  toList : function () {
    return [parseInt(this.x), parseInt(this.y)];
  },

  mult : function (number) {
    return new camgaze.structures.Point(
      parseInt(this.x) * number,
      parseInt(this.y) * number
    );
  },

  add : function (otherPoint) {
    return new camgaze.structures.Point(
      parseInt(this.x) + parseInt(otherPoint.x),
      parseInt(this.y) + parseInt(otherPoint.y)
    );
  },

  sub : function (otherPoint) {
    return new camgaze.structures.Point(
      parseInt(this.x) - parseInt(otherPoint.x),
      parseInt(this.y) - parseInt(otherPoint.y)
    );
  },

  div : function (number) {
    return new camgaze.structures.Point(
      parseInt(parseInt(this.x) / number),
      parseInt(parseInt(this.y) / number)
    );
  },

  // returns the distance to another point
  distTo : function (otherPoint) {
    return Math.sqrt(
      Math.pow(parseInt(this.x) - parseFloat(otherPoint.x), 2) +
      Math.pow(parseInt(this.y) - parseFloat(otherPoint.y), 2)
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
      this.set[camgaze.util.eyeHashFunc(val)] = val;
    }
    return this;
  },

  // updates the value inside the set.
  // If the value is not in the set,
  // it puts it into the set.
  update : function (val) {
    this.set[camgaze.util.eyeHashFunc(val)] = val;
  },

  updateWithList : function (valList) {
    var self = this;
    valList.forEach(
      function (val) {
        self.set[camgaze.util.eyeHashFunc(val)] = val;
      }
    );
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
  },

  toList : function () {
    var retList = new Array();
    for (var key in this.set) {
      retList.push(this.set[key]);
    }
    return retList;
  }
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

camgaze.structures.MovingAveragePoints = function (startingValue, length) {
  this.movAvgList = new Array(length);
  this.lastMean = undefined;
  for (var i = 0; i < length; i++) {
    this.movAvgList[i] = startingValue;
  }
}

camgaze.structures.MovingAveragePoints.prototype = {
  getLength : function () {
    return this.movAvgList.length;
  },

  put : function (value) {
    this.movAvgList.shift(1);
    this.movAvgList.push(value);
    return this;
  },

  removeOutliers : function (maList, refPoint) {
    var acceptableStds = 3.5;
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
        return distList[index] < (meanVal + acceptableStds * std);
      }
    );
  },

  getMean : function (maList) {
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
  },

  compound : function (value, refPoint) {
    this.put(value);
    var maListCopy = this.movAvgList.slice(0);
    this.lastMean = this.getMean(
      //this.removeOutliers(maListCopy, refPoint)
      maListCopy
    );
    return this.lastMean;
  },

  setLength : function (length) {
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
  },

  getLastCompoundedResult : function () {
    return this.lastMean;
  }
}
