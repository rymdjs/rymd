var should = chai.should()

describe("Person", function() {

	var johan = new Person("Johan")

	beforeEach(function() {
		// Before asserts
	})

	it("should have a name", function(){
		johan.name.should.equal("Johan")
	})

	describe("#greet()", function(){
		it("should greet with name", function(){
			johan.greet().should.equal("Hi Johan!")
		})
	})
})
