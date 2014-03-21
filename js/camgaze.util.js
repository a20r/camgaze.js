//////////////////////////////////////////////////////////////
//
// util
//
// Utility functions used by most classes. Functions that
// have nowhere else to go...
//
// Also, here is where I extend other prototypes.
//
//////////////////////////////////////////////////////////////

camgaze.util.eyeHashFunc = function (eye) {
  return eye.getId();
}

Array.prototype.mean = function () {
  var sum = this.reduce(
    function (prev, cur) {
      return prev + cur;
    }
  );

  return sum / this.length;
}
