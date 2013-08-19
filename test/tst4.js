//constructor

/*global require process console __dirname*/

var C = {
	O: function (name) {
		this.name = name;
	}
};

(function () {
	var name = 'name';
	var o = new C.O(name);
	console.log(o.name);
})();
