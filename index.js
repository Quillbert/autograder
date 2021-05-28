//Importing Dependencies
const {spawn, exec} = require('child_process');
const express = require('express');
const socket = require('socket.io');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

//connect to database
var db = new sqlite3.Database('storage.db', (err) => {
	if(err) {
		console.error(err);
		return;
	}
	console.log("connected to db");
});

//Load the names of the problems and initiliazes sql table if not already done
var problems;
exec("ls", {cwd:"./tests"}, (err, stdout) => {
	problems = stdout.split("\n");
	problems.pop();
	console.log("Problems loaded");
	var query = "name TEXT NOT NULL UNIQUE, ";
	for(let i = 0; i < problems.length; i++) {
		query += "\"" + problems[i] + "_attempts\" INTEGER DEFAULT 0, ";
		query += "\"" + problems[i] + "_status\" INTEGER DEFAULT 0, ";
	}
	query = query.substring(0, query.length-2);
	db.run("CREATE TABLE IF NOT EXISTS problems (" +  query + ");");
});

//Initializing Servers
var app = express();
var server = app.listen(process.env.PORT || 80);
app.use(express.static(__dirname + "/public"));

var io = socket(server);
console.log("socket started");

//Handling Server Messages
io.on("connection", function(socket) {
	socket.on("file", function(data) {
		insertName(socket.id, data);
	});
	socket.on("problem-request", function(data) {
		io.emit("problem-set", problems);
	});
	socket.on("data-request", function(data) {
		sendData(socket.id, data);
	});
});

//Adds userName to db if it isn't already there, then continues to run problem
function insertName(id, data) {
	db.run("INSERT OR IGNORE INTO problems (name) VALUES (?);", data.userName, (err) => {
		if(err) {
			console.error(err);
			return;
		}
		create(id, data);
	});
}

//Create a folder for java files, then continue execution
function create(id, data) {
	exec("mkdir " + id, (err) => {
		if (err) {
			console.error(err);
			return;
		}
		addAttempt(id, data);
	});
}

//Updates the Problem attempt counter
function addAttempt(id, data) {
	var query = "\"" + data.problem + "_attempts\"";
	db.run("UPDATE problems SET " + query + " = " + query + " + 1 WHERE name = ?;", data.userName, (err) => {
		if(err) {
			console.error(err);
			return;
		}
		write(id, data);
	});
}	

//Saves the java file, then continues to compilation
function write(id, data) {
	fs.writeFile("./" + id +"/" + data.fileName, data.text, err => {
		if(err) {
			console.error(err);
			return;
		}
		compile(id, data);
	});
}

//Compiles the java file, then continues to run it
function compile(id, data) {
	var ps = spawn("javac", [data.fileName], {cwd: './' + id + '/'});

	ps.stdout.on('data', (data) => {
		console.log("Javac: " + data);
	});

	ps.stderr.on('data', (data) => {
		console.error("compile error: " + data);
		exec("rm -rf " + id);
	});

	ps.on("close", (close) => {
		if(close == 0) {
			run(id, data);
		} else {
			exec("rm -rf " + id);
		}
	});
}

//Runs the code, the continues to send input and check
function run(id, data) {
	var ps = spawn("java", [data.fileName.substring(0, data.fileName.lastIndexOf("."))], {cwd: './' + id + '/'});
	
	var output = "";

	ps.stdout.on('data', (data) => {
		output += data;
	});

	ps.stderr.on('data', (data) => {
		console.error("java error: " + data);
		exec("rm -rf " + id);
	});

	ps.on("close", (close) => {
		exec("rm -rf " + id);
		getOutputFile(output, data, id);
	});

	getInputFile(ps, data.problem);

}

//Sends the input from the file to java stdin
function send(ps, problem, inFile) {
	fs.readFile("./tests/" + problem + "/" + inFile, 'utf8', (err, data) => {
		if(err) {
			console.error(err);
			return;
		}
		ps.stdin.write(data);
	});
}

//Checks whether the output matches the intended output
function check(input, data, outFile, id) {
	fs.readFile("./tests/" + data.problem + "/" + outFile, 'utf8', (err, content) => {
		if(err) {
			console.error(err);
			return;
		}
		content = content.replace(/\r/g, ''); //Standardize line endings
		console.log(String(content) == String(input));
		io.to(id).emit("results", String(content) == String(input));
		updateStatus(data, String(content) == String(input));
	});
}

//Gets the name of the input file for a problem, then sends the data to stdin
function getInputFile(ps, problem) {
	exec("ls", {cwd: './tests/' + problem}, (err, stdout) => {
		if(err) {
			console.error(err);
			return;
		}
		var files = stdout.split("\n");
		for(let i = 0; i < files.length; i++) {
			if(files[i].indexOf(".in") >= 0) {
				send(ps, problem, files[i]);
				return;
			}
		}
		console.error("No input file for: " + problem);
	});
}

//Gets the name of the output file for a problem, then sends the data to be checked
function getOutputFile(input, data, id) {
	exec("ls", {cwd: './tests/' + data.problem}, (err, stdout) => {
		if(err) {
			console.error(err);
			return;
		}
		var files = stdout.split("\n");
		for(let i = 0; i < files.length; i++) {
			if(files[i].indexOf(".out") >= 0) {
				check(input, data, files[i], id);
				return;
			}
		}
		console.error("No output file for: " + data.problem);
	});
}

// Sets the correctness status for a problem
function updateStatus(data, right) {
	var query = "\"" + data.problem + "_status\"";
	var result = 0;
	if(right) {
		result = 1;
	}
	db.run("UPDATE problems SET " + query + " = " + result + " WHERE name = ?;", data.userName, (err) => {
		if(err) {
			console.error(err);
			return;
		}
	});
}

function sendData(id, data) {
	db.get("SELECT * FROM problems WHERE name = ?;", data, (err, row) => {
		if(err) {
			console.error(err);
			return;
		}
		io.to(id).emit("data", row);
	});
}
