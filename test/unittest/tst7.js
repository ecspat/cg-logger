var a = [1, 2, 3, 4].map(function(num) {
	return num * num;
}).filter(function(num) {
	return num % 2 === 0;
});
console.log(a);