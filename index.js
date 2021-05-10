//Importing Dependencies
const {spawn, exec} = require('child_process');
const express = require('express');
const socket = require('socket.io');
const fs = require('fs');

//Initializing Servers
var app = express();
var server = app.listen(process.env.PORT || 80);
app.use(express.static(__dirname + "/public"));

var io = socket(server);
console.log("socket started");

//Handling Server Messages
io.on("connection", function(socket) {
	socket.on("file", function(data) {
		create(socket.id, data);
	});
});

//Create a folder for java files, then continue execution
function create(id, data) {
	exec("mkdir " + id, (err) => {
		if (err) {
			console.error(err);
			return;
		}
		write(id, data);
	});
}

//Saves the java file, then continues to compilation
function write(id, data) {
	fs.writeFile("./" + id +"/" + data.name, data.text, err => {
		if(err) {
			console.error(err);
			return;
		}
		compile(id, data.name);
	});
}

//Compiles the java file, then continues to run it
function compile(id, name) {
	var ps = spawn("javac", [name], {cwd: './' + id + '/'});

	ps.stdout.on('data', (data) => {
		console.log("Javac: " + data);
	});

	ps.stderr.on('data', (data) => {
		console.error("compile error: " + data);
	});

	ps.on("close", (close) => {
		if(close == 0) {
			run(id, name);
		}
	});
}

//Runs the code, the continues to send input and check
function run(id, name) {
	var ps = spawn("java", [name.substring(0, name.lastIndexOf("."))], {cwd: './' + id + '/'});
	
	var output = "";

	ps.stdout.on('data', (data) => {
		output += data;
	});

	ps.stderr.on('data', (data) => {
		console.error("java error: " + data);
	});

	ps.on("close", (close) => {
		exec("rm -rf " + id);
		check(output);
	});

	send(ps);

}

//Sends the input from the file to java stdin
function send(ps) {
	fs.readFile("./tests/Prob01/Prob01.in.txt", 'utf8', (err, data) => {
		if(err) {
			console.error(err);
			return;
		}
		ps.stdin.write(data);
	});
}

//Checks whether the output matches the intended output
function check(input) {
	fs.readFile("./tests/Prob01/Prob01.out.txt", 'utf8', (err, data) => {
		if(err) {
			console.error(err);
			return;
		}
		data = data.replace(/\r/g, ''); //Standardize line endings
		console.log(String(data) == String(input));
	});
}
