//method invocation

/*global require process console*/

var o = {
	m: function f1(a, b){
		console.log(a+b);
	}
};

o.m(1, 2);

o['m'](1, 2);