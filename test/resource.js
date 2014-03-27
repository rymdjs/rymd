var should = chai.should();

describe("Resource", function() {

  var metadata;

  beforeEach(function() {
    metadata = {
      name: 'john.jpg',
      author: 'john',
      version: 1,
      type: 'image/jpeg',
      id: '1',
      timestamp: Date.now()
    };
  });

  it('should work to bump version', function() {
    var resource = new Resource(metadata, {});
    resource.update({ name: 'john' });

    resource.metadata.version.should.equal(2);
  });

  describe('AvailableResource', function() {

    it('should not have any data', function() {
      var resource = new Resource(metadata);

      resource.hasData.should.equal(false);
      should.not.exist(resource.data);
    });

  });

  describe('Resource', function() {

    it('should have data', function() {
      var resource = new Resource(metadata, {});

      resource.hasData.should.equal(true);
      resource.data.exist;
    });

  });

});
