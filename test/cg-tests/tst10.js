function O () {
	this.name = 'Hello World';
};

var o = new O();

if (o.hasOwnProperty('name'))
	console.log(o.name);
