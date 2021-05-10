const {spawn, exec} = require('child_process');
var express = require('express');
var app = express();
var server = app.listen(process.env.PORT || 80);
app.use(express.static(__dirname + "/public"));
var socket = require('socket.io');
var io = socket(server);
const fs = require('fs');
console.log("socket started");


fs.readFile("./tests/Prob01/Prob01.in.txt", 'utf8', (err, data) => {
	var text = "";
	if(err) {
		console.error(err);
		return;
	}
	text = data;
	//console.log(text);
});

io.on("connection", function(socket) {
	socket.on("file", function(data) {
		console.log("recieved");
		exec("mkdir " + socket.id, (err) => {
		  if (err) {
			console.error(err);
			return;
		  }
			fs.writeFile("./" + socket.id+"/" + data.name, data.text, err => {
			  if (err) {
				console.error(err);
				return;
			  }
			  run(socket.id, data.name);
			});
		});
	});
});
function run(data, name) {
	var ps = spawn("javac", [name], {cwd: './'+ data + '/'});

	var done = false;

	ps.stdout.on('data', (data) => {
		var s = data + "";
		if(s.trim().length > 0) {
			console.log("Java says: " + s.trim());
		}
	});


	ps.stderr.on('data', (data) => {
	  console.error(`ps stderr: ${data}`);
	});

	ps.on("close", (close) => {
		if(close == 0) {
			console.log("compiled");
			var output = "";
			var ps1 = spawn("java", [name.substring(0, name.lastIndexOf("."))], {cwd: './' + data + '/'});
			//var ps1 = spawn("java", ["Test"], {cwd: './test/'});
			ps1.stdout.on('data', (data) => {
				var s = data + "";
				output += data;
				if(s.trim().length > 0) {
					//console.log("Java says: " + s.trim());
				}
			});

			ps1.stderr.on('data', (data) => {
			  console.error(`ps stderr: ${data}`);
			});
			
			ps1.on("close", (close) => {
				exec("rm -rf " + data);
				check(output);
			});


			/*ps1.stdin.write(
				"1\n"+
				"6 2\n"+
				"0 1\n"+
				"2 1\n"+
				"3 1\n"+
				"0 0\n"+
				"1 0\n"+
				"2 0\n"+
				"1 1\n"+
				"3 0\n"
			);*/
			send(ps1);
		}
	});
}

function send(ps) {
	fs.readFile("./tests/Prob01/Prob01.in.txt", 'utf8', (err, data) => {
	var text = "";
	if(err) {
		console.error(err);
		return;
	}
	text = data;
	ps.stdin.write(text);
});

}

function check(input) {
	fs.readFile("./tests/Prob01/Prob01.out.txt", 'utf8', (err, data) => {
		if(err) {
			console.error(err);
			return;
		}
		data = data.replace(/\r/g, '');
		console.log(String(data) == String(input));
	});
}
