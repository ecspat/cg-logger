//method invocation

function f() {
	console.log('Hello');
}

var o = function() {};
o.m = f;

o.m();
o['m']();

var c = {
	b : {
		a : {
			m : f
		}
	}
};

c.b.a.m();