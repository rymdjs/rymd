function Store(spies) {
  this.spies = spies;
};

Store.prototype.use = function() {
  return this;
};

Store.prototype.save = function() {};

Store.prototype.get = function() {};