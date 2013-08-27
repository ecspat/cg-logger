var o = {
    g: function() {
	console.log("Hello, world!");
	return "h";
    }
};

function f(i) {
    if(i >= 0) {
	return (i ? this : o)[f(i-1)]();
    } else {
	return "g";
    }
}

function h() {}

f(1);