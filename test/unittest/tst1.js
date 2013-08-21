//global functions invocation

function f() {
	g();
};
function p() {

};
function g() {
	p();
};

f();