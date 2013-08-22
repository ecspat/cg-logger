//wrapper in function scope 

function f() {
	g();
	function g() {
		m();		
		function m() {
			(function () {
				function p() {
					console.log("Hello");
				}
				p();
			})();
		}
	}
}

f();